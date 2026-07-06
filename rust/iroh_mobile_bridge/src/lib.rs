//! iroh_mobile_bridge — Iroh endpoint and framed stream bridge for React Native.

use std::{
    collections::{HashMap, VecDeque},
    net::SocketAddr,
    str::FromStr,
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc, Mutex, OnceLock,
    },
    time::Duration,
};

use iroh::{endpoint::Endpoint, EndpointAddr, EndpointId, RelayUrl, TransportAddr};
use serde::Deserialize;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    runtime::{Builder as RuntimeBuilder, Runtime},
    sync::{mpsc, Notify},
    time,
};

const SOVEREIGN_ALPN: &[u8] = b"iroh-http/2-duplex";
const MAX_FRAME_BYTES: u32 = 2 * 1024 * 1024;
const CONNECT_TIMEOUT_MS: u64 = 4_500;

static STATE: OnceLock<Mutex<BridgeState>> = OnceLock::new();
static NEXT_CONNECTION_ID: AtomicU64 = AtomicU64::new(1);
#[cfg(target_os = "android")]
static ANDROID_CONTEXT_INITIALIZED: AtomicBool = AtomicBool::new(false);

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum IrohBridgeError {
    #[error("Iroh endpoint is already started")]
    AlreadyStarted,
    #[error("Iroh endpoint is not started")]
    NotStarted,
    #[error("Iroh connection is not open")]
    NotConnected,
    #[error("Invalid Iroh node id")]
    InvalidNodeId,
    #[error("Invalid Iroh frame")]
    InvalidFrame,
    #[error("Iroh operation failed: {message}")]
    OperationFailed { message: String },
    #[error("Internal error")]
    InternalError,
}

struct BridgeState {
    runtime: Runtime,
    endpoint: Option<Endpoint>,
    node_id: Option<String>,
    connections: HashMap<String, ManagedConnection>,
}

#[derive(Clone)]
struct ManagedConnection {
    tx: mpsc::Sender<Vec<u8>>,
    inbox: Arc<Mutex<VecDeque<Vec<u8>>>>,
    notify: Arc<Notify>,
    closed: Arc<AtomicBool>,
}

fn state() -> &'static Mutex<BridgeState> {
    STATE.get_or_init(|| {
        let runtime = RuntimeBuilder::new_multi_thread()
            .worker_threads(2)
            .enable_all()
            .build()
            .expect("failed to create iroh runtime");
        Mutex::new(BridgeState {
            runtime,
            endpoint: None,
            node_id: None,
            connections: HashMap::new(),
        })
    })
}

fn with_state<T>(f: impl FnOnce(&mut BridgeState) -> Result<T, IrohBridgeError>) -> Result<T, IrohBridgeError> {
    let mut guard = state().lock().map_err(|_| IrohBridgeError::InternalError)?;
    f(&mut guard)
}

fn err(error: impl std::fmt::Display) -> IrohBridgeError {
    IrohBridgeError::OperationFailed {
        message: error.to_string(),
    }
}

#[cfg(target_os = "android")]
#[no_mangle]
pub unsafe extern "C" fn musichub_iroh_bridge_init_android_context(
    java_vm: *mut std::ffi::c_void,
    application_context: *mut std::ffi::c_void,
) -> u8 {
    if ANDROID_CONTEXT_INITIALIZED.load(Ordering::SeqCst) {
        return 1;
    }
    if java_vm.is_null() || application_context.is_null() {
        return 0;
    }

    let initialized = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        // Iroh's Android DNS reader uses ndk_context. React Native/Expo does
        // not initialize it for Rust crates, so publish the JavaVM and the
        // long-lived Application context before constructing an Endpoint.
        iroh_dns::install_android_jni_context(java_vm, application_context);
    }))
    .is_ok();

    if initialized {
        ANDROID_CONTEXT_INITIALIZED.store(true, Ordering::SeqCst);
        1
    } else {
        0
    }
}

#[cfg(not(target_os = "android"))]
#[no_mangle]
pub unsafe extern "C" fn musichub_iroh_bridge_init_android_context(
    _java_vm: *mut std::ffi::c_void,
    _application_context: *mut std::ffi::c_void,
) -> u8 {
    1
}

fn normalize_node_id(input: &str) -> &str {
    input
        .strip_prefix("iroh+relay://")
        .or_else(|| input.strip_prefix("iroh://"))
        .unwrap_or(input)
        .trim()
}

#[derive(Debug, Deserialize)]
struct IrohAddressTicket {
    id: Option<String>,
    addrs: Option<Vec<String>>,
}

fn normalize_dial_hint(input: &str) -> &str {
    input
        .strip_prefix("iroh+ticket://")
        .or_else(|| input.strip_prefix("iroh+ticket:"))
        .unwrap_or(input)
        .trim()
}

fn parse_transport_addr(input: &str) -> Option<TransportAddr> {
    let value = input
        .trim()
        .strip_prefix("iroh+direct://")
        .or_else(|| input.trim().strip_prefix("ip:"))
        .unwrap_or(input.trim());

    if let Ok(socket_addr) = SocketAddr::from_str(value) {
        return Some(TransportAddr::Ip(socket_addr));
    }

    let relay_value = value.strip_prefix("relay:").unwrap_or(value);
    if relay_value.starts_with("http://") || relay_value.starts_with("https://") {
        if let Ok(relay_url) = RelayUrl::from_str(relay_value) {
            return Some(TransportAddr::Relay(relay_url));
        }
    }

    None
}

fn endpoint_addr_from_hint(
    remote_id: EndpointId,
    relay_url: Option<&str>,
) -> Result<EndpointAddr, IrohBridgeError> {
    let Some(hint) = relay_url.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(EndpointAddr::new(remote_id));
    };

    let hint = normalize_dial_hint(hint);
    if hint.starts_with('{') {
        let ticket: IrohAddressTicket = serde_json::from_str(hint).map_err(err)?;
        let ticket_id = match ticket.id.as_deref() {
            Some(id) => EndpointId::from_str(normalize_node_id(id))
                .map_err(|_| IrohBridgeError::InvalidNodeId)?,
            None => remote_id,
        };
        let addrs = ticket
            .addrs
            .unwrap_or_default()
            .into_iter()
            .filter_map(|addr| parse_transport_addr(&addr))
            .collect::<Vec<_>>();
        if addrs.is_empty() {
            return Err(err("Iroh addressing hint did not include usable addresses"));
        }
        return Ok(EndpointAddr::from_parts(ticket_id, addrs));
    }

    if let Some(addr) = parse_transport_addr(hint) {
        return Ok(EndpointAddr::from_parts(remote_id, [addr]));
    }

    Ok(EndpointAddr::new(remote_id))
}

async fn write_frame<W>(writer: &mut W, payload: &[u8]) -> Result<(), IrohBridgeError>
where
    W: AsyncWriteExt + Unpin,
{
    if payload.len() > MAX_FRAME_BYTES as usize {
        return Err(IrohBridgeError::InvalidFrame);
    }
    writer
        .write_all(&(payload.len() as u32).to_be_bytes())
        .await
        .map_err(err)?;
    writer.write_all(payload).await.map_err(err)?;
    writer.flush().await.map_err(err)?;
    Ok(())
}

async fn read_frame<R>(reader: &mut R) -> Result<Option<Vec<u8>>, IrohBridgeError>
where
    R: AsyncReadExt + Unpin,
{
    let mut len_buf = [0u8; 4];
    match reader.read_exact(&mut len_buf).await {
        Ok(_) => {}
        Err(error) if error.kind() == std::io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(error) => return Err(err(error)),
    }
    let len = u32::from_be_bytes(len_buf);
    if len == 0 || len > MAX_FRAME_BYTES {
        return Err(IrohBridgeError::InvalidFrame);
    }
    let mut payload = vec![0u8; len as usize];
    reader.read_exact(&mut payload).await.map_err(err)?;
    Ok(Some(payload))
}

/// Returns the version of this bridge module.
#[uniffi::export]
fn bridge_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Returns the Iroh node id as z-base-32, matching @momics/iroh-http-node.
#[uniffi::export]
fn node_id() -> String {
    with_state(|state| Ok(state.node_id.clone().unwrap_or_default())).unwrap_or_default()
}

/// Start the Iroh endpoint.
#[uniffi::export]
fn start() -> Result<(), IrohBridgeError> {
    with_state(|state| {
        if state.endpoint.is_some() {
            return Ok(());
        }

        let endpoint = state.runtime.block_on(async {
            Endpoint::builder(iroh::endpoint::presets::Minimal)
                .alpns(vec![SOVEREIGN_ALPN.to_vec()])
                .bind()
                .await
                .map_err(err)
        })?;
        state.node_id = Some(endpoint.id().to_z32());
        state.endpoint = Some(endpoint);
        Ok(())
    })
}

/// Stop the Iroh endpoint and close all active connections.
#[uniffi::export]
fn stop() {
    let _ = with_state(|state| {
        for (_, connection) in state.connections.drain() {
            connection.closed.store(true, Ordering::SeqCst);
            connection.notify.notify_waiters();
        }
        if let Some(endpoint) = state.endpoint.take() {
            state.runtime.block_on(async move {
                endpoint.close().await;
            });
        }
        state.node_id = None;
        Ok(())
    });
}

/// Returns true if the endpoint is running.
#[uniffi::export]
fn is_running() -> bool {
    with_state(|state| Ok(state.endpoint.is_some())).unwrap_or(false)
}

/// Dial a remote Iroh node and open a bidirectional framed stream.
#[uniffi::export]
fn connect(node_id: String, relay_url: Option<String>) -> Result<String, IrohBridgeError> {
    with_state(|state| {
        if state.endpoint.is_none() {
            return Err(IrohBridgeError::NotStarted);
        }
        let endpoint = state.endpoint.clone().ok_or(IrohBridgeError::NotStarted)?;
        let remote_id = EndpointId::from_str(normalize_node_id(&node_id))
            .map_err(|_| IrohBridgeError::InvalidNodeId)?;
        let endpoint_addr = endpoint_addr_from_hint(remote_id, relay_url.as_deref())?;

        let (mut send_stream, mut recv_stream) = state.runtime.block_on(async {
            time::timeout(Duration::from_millis(CONNECT_TIMEOUT_MS), async {
                let connection = endpoint.connect(endpoint_addr, SOVEREIGN_ALPN).await.map_err(err)?;
                connection.open_bi().await.map_err(err)
            })
            .await
            .map_err(|_| err("Iroh connect timed out"))?
        })?;

        let connection_id = format!("iroh-{}", NEXT_CONNECTION_ID.fetch_add(1, Ordering::SeqCst));
        let (tx, mut rx) = mpsc::channel::<Vec<u8>>(128);
        let inbox = Arc::new(Mutex::new(VecDeque::<Vec<u8>>::new()));
        let notify = Arc::new(Notify::new());
        let closed = Arc::new(AtomicBool::new(false));

        let writer_closed = closed.clone();
        state.runtime.spawn(async move {
            while let Some(payload) = rx.recv().await {
                if writer_closed.load(Ordering::SeqCst) {
                    break;
                }
                if write_frame(&mut send_stream, &payload).await.is_err() {
                    break;
                }
            }
            let _ = send_stream.finish();
            writer_closed.store(true, Ordering::SeqCst);
        });

        let reader_inbox = inbox.clone();
        let reader_notify = notify.clone();
        let reader_closed = closed.clone();
        state.runtime.spawn(async move {
            loop {
                match read_frame(&mut recv_stream).await {
                    Ok(Some(payload)) => {
                        if let Ok(mut guard) = reader_inbox.lock() {
                            guard.push_back(payload);
                        }
                        reader_notify.notify_waiters();
                    }
                    Ok(None) | Err(_) => {
                        reader_closed.store(true, Ordering::SeqCst);
                        reader_notify.notify_waiters();
                        break;
                    }
                }
            }
        });

        state.connections.insert(
            connection_id.clone(),
            ManagedConnection {
                tx,
                inbox,
                notify,
                closed,
            },
        );
        Ok(connection_id)
    })
}

/// Send one framed payload on an open connection.
#[uniffi::export]
fn send(connection_id: String, data: Vec<u8>) -> Result<(), IrohBridgeError> {
    let connection = with_state(|state| {
        state
            .connections
            .get(&connection_id)
            .cloned()
            .ok_or(IrohBridgeError::NotConnected)
    })?;
    if connection.closed.load(Ordering::SeqCst) {
        return Err(IrohBridgeError::NotConnected);
    }
    connection.tx.blocking_send(data).map_err(err)?;
    Ok(())
}

/// Wait for the next framed payload. Returns null/None on timeout or close.
#[uniffi::export]
fn next_message(connection_id: String, timeout_ms: u64) -> Result<Option<Vec<u8>>, IrohBridgeError> {
    let connection = with_state(|state| {
        state
            .connections
            .get(&connection_id)
            .cloned()
            .ok_or(IrohBridgeError::NotConnected)
    })?;

    if let Ok(mut inbox) = connection.inbox.lock() {
        if let Some(payload) = inbox.pop_front() {
            return Ok(Some(payload));
        }
    }
    if connection.closed.load(Ordering::SeqCst) {
        return Ok(None);
    }
    if timeout_ms == 0 {
        return Ok(None);
    }

    let notify = connection.notify.clone();
    let duration = Duration::from_millis(timeout_ms);
    with_state(|state| {
        state.runtime.block_on(async {
            let _ = time::timeout(duration, notify.notified()).await;
        });
        Ok(())
    })?;

    if let Ok(mut inbox) = connection.inbox.lock() {
        return Ok(inbox.pop_front());
    }
    Ok(None)
}

/// Close a connection by id.
#[uniffi::export]
fn close(connection_id: String) -> Result<(), IrohBridgeError> {
    with_state(|state| {
        if let Some(connection) = state.connections.remove(&connection_id) {
            connection.closed.store(true, Ordering::SeqCst);
            connection.notify.notify_waiters();
        }
        Ok(())
    })
}

/// Echo a string — keeps the P1 smoke test API available.
#[uniffi::export]
fn echo_roundtrip(input: String) -> String {
    format!("echo: {}", input)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static TEST_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn test_bridge_version() {
        assert_eq!(bridge_version(), "0.1.0");
    }

    #[test]
    fn test_echo_roundtrip() {
        assert_eq!(echo_roundtrip("hello".to_string()), "echo: hello");
    }

    #[test]
    fn test_lifecycle() {
        let _guard = TEST_LOCK.lock().unwrap();
        stop();
        assert!(!is_running());
        start().expect("start should succeed");
        assert!(is_running());
        assert!(!node_id().is_empty());
        stop();
        assert!(!is_running());
        assert_eq!(node_id(), "");
    }

    #[test]
    fn test_invalid_connect_target_fails() {
        let _guard = TEST_LOCK.lock().unwrap();
        stop();
        start().expect("start should succeed");
        let result = connect("not-a-node".to_string(), None);
        assert!(matches!(result, Err(IrohBridgeError::InvalidNodeId)));
        stop();
    }

    #[test]
    fn test_send_without_connection_fails() {
        let _guard = TEST_LOCK.lock().unwrap();
        let result = send("missing".to_string(), b"hello".to_vec());
        assert!(matches!(result, Err(IrohBridgeError::NotConnected)));
    }

    #[test]
    fn test_frame_roundtrip_helpers() {
        let rt = RuntimeBuilder::new_current_thread().enable_all().build().unwrap();
        rt.block_on(async {
            let (mut client, mut server) = tokio::io::duplex(1024);
            write_frame(&mut client, b"{\"kind\":\"ping\"}").await.unwrap();
            let frame = read_frame(&mut server).await.unwrap().unwrap();
            assert_eq!(frame, b"{\"kind\":\"ping\"}");
        });
    }
}

uniffi::setup_scaffolding!();
