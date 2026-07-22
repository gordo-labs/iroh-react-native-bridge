//! iroh_mobile_bridge — generic Iroh endpoint and framed stream bridge for React Native.

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

use iroh::{
    endpoint::{Connection, Endpoint},
    EndpointAddr, EndpointId, RelayMode, RelayUrl, TransportAddr,
};
use serde::Deserialize;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    runtime::{Builder as RuntimeBuilder, Runtime},
    sync::{mpsc, watch, Notify, OwnedSemaphorePermit, Semaphore},
    time,
};

const DEFAULT_ALPN: &str = "iroh-rn/1";
const MAX_FRAME_BYTES: u32 = 2 * 1024 * 1024;
const DEFAULT_CONNECT_TIMEOUT_MS: u64 = 4_500;
const SEND_QUEUE_FRAMES: usize = 64;
const MAX_SEND_QUEUE_BYTES: usize = 16 * 1024 * 1024;
const MAX_INBOX_FRAMES: usize = 256;
const MAX_INBOX_BYTES: usize = 16 * 1024 * 1024;
const MAX_CACHED_SESSIONS: usize = 32;

static STATE: OnceLock<Mutex<BridgeState>> = OnceLock::new();
static NEXT_CONNECTION_ID: AtomicU64 = AtomicU64::new(1);
static NEXT_SESSION_USE: AtomicU64 = AtomicU64::new(1);
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
    alpns: Vec<Vec<u8>>,
    sessions: HashMap<String, ManagedSession>,
    connections: HashMap<String, ManagedConnection>,
}

#[derive(Clone)]
struct ManagedSession {
    connection: Connection,
    last_used: u64,
}

#[derive(Default)]
struct InboxState {
    frames: VecDeque<Vec<u8>>,
    bytes: usize,
}

#[derive(Clone)]
struct ManagedConnection {
    tx: mpsc::Sender<QueuedFrame>,
    send_capacity: Arc<Semaphore>,
    inbox: Arc<Mutex<InboxState>>,
    notify: Arc<Notify>,
    capacity: Arc<Notify>,
    close_tx: watch::Sender<bool>,
    closed: Arc<AtomicBool>,
}

struct QueuedFrame {
    payload: Vec<u8>,
    _capacity: OwnedSemaphorePermit,
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
            alpns: Vec::new(),
            sessions: HashMap::new(),
            connections: HashMap::new(),
        })
    })
}

fn with_state<T>(
    f: impl FnOnce(&mut BridgeState) -> Result<T, IrohBridgeError>,
) -> Result<T, IrohBridgeError> {
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
/// Installs the process-wide Android JNI context required by Iroh DNS.
///
/// # Safety
///
/// `java_vm` must point to the live process `JavaVM`, and
/// `application_context` must be a valid long-lived global reference to an
/// Android `Context`. Both pointers must remain valid for the process lifetime.
pub unsafe extern "C" fn react_native_iroh_init_android_context(
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
/// No-op compatibility symbol for non-Android targets.
///
/// # Safety
///
/// The arguments are ignored and may be null on non-Android platforms.
pub unsafe extern "C" fn react_native_iroh_init_android_context(
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

fn parse_endpoint_id(input: &str) -> Result<EndpointId, IrohBridgeError> {
    let value = normalize_node_id(input);
    // `node_id()` publicly returns z-base-32. Iroh's `FromStr` parser accepts
    // hex/base32hex instead, so trying it first can reject—or worse,
    // ambiguously reinterpret—a valid public bridge id.
    EndpointId::from_z32(value)
        .or_else(|_| EndpointId::from_str(value))
        .map_err(|_| IrohBridgeError::InvalidNodeId)
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

fn normalize_alpn(alpn: &str) -> Result<Vec<u8>, IrohBridgeError> {
    let value = alpn.trim();
    if value.is_empty() {
        return Err(err("Iroh ALPN must not be empty"));
    }
    Ok(value.as_bytes().to_vec())
}

fn normalize_alpn_list(alpns: Option<Vec<String>>) -> Result<Vec<Vec<u8>>, IrohBridgeError> {
    let values = alpns.unwrap_or_else(|| vec![DEFAULT_ALPN.to_string()]);
    if values.is_empty() {
        return Err(err("At least one Iroh ALPN is required"));
    }
    values
        .iter()
        .map(|value| normalize_alpn(value))
        .collect::<Result<Vec<_>, _>>()
}

fn endpoint_addr_from_hint(
    remote_id: EndpointId,
    address_hint: Option<&str>,
) -> Result<EndpointAddr, IrohBridgeError> {
    let Some(hint) = address_hint
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return Err(err("Iroh addressing hint is required for dialing"));
    };

    if hint.starts_with("iroh+relay://") {
        return Err(err(
            "Iroh relay hint did not include a relay server URL or direct addresses",
        ));
    }

    let hint = normalize_dial_hint(hint);
    if hint.starts_with('{') {
        let ticket: IrohAddressTicket = serde_json::from_str(hint).map_err(err)?;
        let ticket_id = match ticket.id.as_deref() {
            Some(id) => parse_endpoint_id(id)?,
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

    Err(err("Iroh addressing hint did not include usable addresses"))
}

async fn write_frame<W>(writer: &mut W, payload: &[u8]) -> Result<(), IrohBridgeError>
where
    W: AsyncWriteExt + Unpin,
{
    if payload.is_empty() || payload.len() > MAX_FRAME_BYTES as usize {
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

fn session_key(remote_id: &EndpointId, alpn: &[u8]) -> String {
    format!("{}:{}", remote_id.to_z32(), hex::encode(alpn))
}

fn cache_session(state: &mut BridgeState, key: String, connection: Connection) {
    state.sessions.insert(
        key,
        ManagedSession {
            connection,
            last_used: NEXT_SESSION_USE.fetch_add(1, Ordering::Relaxed),
        },
    );
    while state.sessions.len() > MAX_CACHED_SESSIONS {
        let Some(oldest) = state
            .sessions
            .iter()
            .min_by_key(|(_, session)| session.last_used)
            .map(|(key, _)| key.clone())
        else {
            break;
        };
        state.sessions.remove(&oldest);
    }
}

async fn enqueue_inbox_frame(
    inbox: &Arc<Mutex<InboxState>>,
    capacity: &Arc<Notify>,
    close_rx: &mut watch::Receiver<bool>,
    payload: Vec<u8>,
) -> bool {
    let mut pending = Some(payload);
    loop {
        if *close_rx.borrow() {
            return false;
        }
        let capacity_notified = capacity.notified();
        {
            let Ok(mut guard) = inbox.lock() else {
                return false;
            };
            let payload = pending.as_ref().expect("pending inbox payload");
            if guard.frames.len() < MAX_INBOX_FRAMES
                && guard.bytes.saturating_add(payload.len()) <= MAX_INBOX_BYTES
            {
                let payload = pending.take().expect("pending inbox payload");
                guard.bytes += payload.len();
                guard.frames.push_back(payload);
                return true;
            }
        }
        tokio::select! {
            _ = capacity_notified => {}
            changed = close_rx.changed() => {
                if changed.is_err() || *close_rx.borrow() {
                    return false;
                }
            }
        }
    }
}

async fn open_bi_with_timeout(
    connection: &Connection,
    timeout: Duration,
) -> Result<(iroh::endpoint::SendStream, iroh::endpoint::RecvStream), IrohBridgeError> {
    time::timeout(timeout, connection.open_bi())
        .await
        .map_err(|_| err("Iroh stream open timed out"))?
        .map_err(err)
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
fn start(alpns: Option<Vec<String>>) -> Result<(), IrohBridgeError> {
    with_state(|state| {
        if state.endpoint.is_some() {
            return Ok(());
        }
        let endpoint_alpns = normalize_alpn_list(alpns)?;

        let endpoint = state.runtime.block_on(async {
            // presets::Minimal leaves RelayMode::Disabled, which strips the relay
            // transport entirely: relay candidates in the peer's EndpointAddr are
            // undialable and NAT hole punching (coordinated over relays) never
            // happens, so connects only succeed when a direct addr is reachable
            // (same LAN). Enable the default relay servers so cross-network dials
            // can fall back to the remote peer's relay.
            Endpoint::builder(iroh::endpoint::presets::Minimal)
                .relay_mode(RelayMode::Default)
                .alpns(endpoint_alpns.clone())
                .bind()
                .await
                .map_err(err)
        })?;
        state.node_id = Some(endpoint.id().to_z32());
        state.alpns = endpoint_alpns;
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
            let _ = connection.close_tx.send(true);
            connection.notify.notify_one();
            connection.capacity.notify_waiters();
        }
        state.sessions.clear();
        if let Some(endpoint) = state.endpoint.take() {
            state.runtime.block_on(async move {
                endpoint.close().await;
            });
        }
        state.node_id = None;
        state.alpns = Vec::new();
        Ok(())
    });
}

/// Returns true if the endpoint is running.
#[uniffi::export]
fn is_running() -> bool {
    with_state(|state| Ok(state.endpoint.is_some())).unwrap_or(false)
}

/// Dial or reuse a remote Iroh session and open one bidirectional framed stream.
#[uniffi::export]
fn connect(
    node_id: String,
    alpn: String,
    address_hint: Option<String>,
    timeout_ms: Option<u32>,
) -> Result<String, IrohBridgeError> {
    let remote_id = parse_endpoint_id(&node_id)?;
    let alpn_bytes = normalize_alpn(&alpn)?;
    let key = session_key(&remote_id, &alpn_bytes);
    let endpoint_addr = endpoint_addr_from_hint(remote_id, address_hint.as_deref())?;
    let timeout = Duration::from_millis(
        timeout_ms
            .map(u64::from)
            .filter(|value| *value > 0)
            .unwrap_or(DEFAULT_CONNECT_TIMEOUT_MS),
    );

    let (endpoint, runtime, cached) = with_state(|state| {
        let endpoint = state.endpoint.clone().ok_or(IrohBridgeError::NotStarted)?;
        let cached = state.sessions.get_mut(&key).and_then(|session| {
            if session.connection.close_reason().is_some() {
                None
            } else {
                session.last_used = NEXT_SESSION_USE.fetch_add(1, Ordering::Relaxed);
                Some(session.connection.clone())
            }
        });
        if cached.is_none() {
            state.sessions.remove(&key);
        }
        Ok((endpoint, state.runtime.handle().clone(), cached))
    })?;

    // `connect()` remains source-compatible, but now means "open one framed
    // stream on the peer session". Repeated calls for the same peer + ALPN
    // reuse one QUIC connection, so independent app requests avoid HOL.
    let (session, mut send_stream, mut recv_stream) = runtime.block_on(async {
        if let Some(connection) = cached {
            if let Ok((send, recv)) = open_bi_with_timeout(&connection, timeout).await {
                return Ok((connection, send, recv));
            }
        }

        let connection = time::timeout(timeout, endpoint.connect(endpoint_addr, &alpn_bytes))
            .await
            .map_err(|_| err("Iroh connect timed out"))?
            .map_err(err)?;
        let (send, recv) = open_bi_with_timeout(&connection, timeout).await?;
        Ok((connection, send, recv))
    })?;

    with_state(|state| {
        cache_session(state, key, session);
        Ok(())
    })?;

    let connection_id = format!("iroh-{}", NEXT_CONNECTION_ID.fetch_add(1, Ordering::SeqCst));
    let (tx, mut rx) = mpsc::channel::<QueuedFrame>(SEND_QUEUE_FRAMES);
    let send_capacity = Arc::new(Semaphore::new(MAX_SEND_QUEUE_BYTES));
    let inbox = Arc::new(Mutex::new(InboxState::default()));
    let notify = Arc::new(Notify::new());
    let capacity = Arc::new(Notify::new());
    let closed = Arc::new(AtomicBool::new(false));
    let (close_tx, mut writer_close_rx) = watch::channel(false);
    let mut reader_close_rx = close_tx.subscribe();

    let writer_closed = closed.clone();
    let writer_notify = notify.clone();
    let writer_capacity = capacity.clone();
    let writer_close_tx = close_tx.clone();
    runtime.spawn(async move {
        let mut cancelled = false;
        loop {
            tokio::select! {
                changed = writer_close_rx.changed() => {
                    if changed.is_err() || *writer_close_rx.borrow() {
                        cancelled = true;
                        break;
                    }
                }
                frame = rx.recv() => {
                    let Some(frame) = frame else { break; };
                    let write = tokio::select! {
                        changed = writer_close_rx.changed() => {
                            cancelled = changed.is_err() || *writer_close_rx.borrow();
                            None
                        }
                        result = write_frame(&mut send_stream, &frame.payload) => Some(result),
                    };
                    if !matches!(write, Some(Ok(()))) {
                        break;
                    }
                }
            }
        }
        if cancelled {
            let _ = send_stream.reset(0u32.into());
        } else {
            let _ = send_stream.finish();
        }
        writer_closed.store(true, Ordering::SeqCst);
        let _ = writer_close_tx.send(true);
        writer_notify.notify_one();
        writer_capacity.notify_waiters();
    });

    let reader_inbox = inbox.clone();
    let reader_notify = notify.clone();
    let reader_capacity = capacity.clone();
    let reader_closed = closed.clone();
    let reader_close_tx = close_tx.clone();
    runtime.spawn(async move {
        let mut cancelled = false;
        loop {
            let read = tokio::select! {
                changed = reader_close_rx.changed() => {
                    if changed.is_err() || *reader_close_rx.borrow() {
                        cancelled = true;
                        break;
                    }
                    continue;
                }
                read = read_frame(&mut recv_stream) => read,
            };
            match read {
                Ok(Some(payload)) => {
                    if !enqueue_inbox_frame(
                        &reader_inbox,
                        &reader_capacity,
                        &mut reader_close_rx,
                        payload,
                    )
                    .await
                    {
                        cancelled = *reader_close_rx.borrow();
                        break;
                    }
                    reader_notify.notify_one();
                }
                Ok(None) | Err(_) => break,
            }
        }
        if cancelled {
            let _ = recv_stream.stop(0u32.into());
        }
        reader_closed.store(true, Ordering::SeqCst);
        let _ = reader_close_tx.send(true);
        reader_notify.notify_one();
        reader_capacity.notify_waiters();
    });

    with_state(|state| {
        state.connections.insert(
            connection_id.clone(),
            ManagedConnection {
                tx,
                send_capacity,
                inbox,
                notify,
                capacity,
                close_tx,
                closed,
            },
        );
        Ok(connection_id)
    })
}

/// Send one framed payload on an open connection.
#[uniffi::export]
fn send(connection_id: String, data: Vec<u8>) -> Result<(), IrohBridgeError> {
    if data.is_empty() || data.len() > MAX_FRAME_BYTES as usize {
        return Err(IrohBridgeError::InvalidFrame);
    }
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
    let capacity = connection
        .send_capacity
        .clone()
        .try_acquire_many_owned(data.len() as u32)
        .map_err(|_| err("Iroh send queue is full"))?;
    match connection.tx.try_send(QueuedFrame {
        payload: data,
        _capacity: capacity,
    }) {
        Ok(()) => Ok(()),
        Err(mpsc::error::TrySendError::Full(_)) => Err(err("Iroh send queue is full")),
        Err(mpsc::error::TrySendError::Closed(_)) => Err(IrohBridgeError::NotConnected),
    }
}

/// Returns whether a framed stream is still open in the native runtime.
#[uniffi::export]
fn is_stream_open(connection_id: String) -> bool {
    with_state(|state| {
        Ok(state
            .connections
            .get(&connection_id)
            .map(|connection| !connection.closed.load(Ordering::SeqCst))
            .unwrap_or(false))
    })
    .unwrap_or(false)
}

/// Wait for the next framed payload. Returns null/None on timeout or close.
#[uniffi::export]
fn next_message(
    connection_id: String,
    timeout_ms: u64,
) -> Result<Option<Vec<u8>>, IrohBridgeError> {
    let connection = with_state(|state| {
        state
            .connections
            .get(&connection_id)
            .cloned()
            .ok_or(IrohBridgeError::NotConnected)
    })?;

    let notified = connection.notify.notified();
    if let Ok(mut inbox) = connection.inbox.lock() {
        if let Some(payload) = inbox.frames.pop_front() {
            inbox.bytes = inbox.bytes.saturating_sub(payload.len());
            connection.capacity.notify_one();
            return Ok(Some(payload));
        }
    }
    if connection.closed.load(Ordering::SeqCst) {
        return Ok(None);
    }
    if timeout_ms == 0 {
        return Ok(None);
    }

    let duration = Duration::from_millis(timeout_ms);
    let runtime = with_state(|state| Ok(state.runtime.handle().clone()))?;
    runtime.block_on(async {
        let _ = time::timeout(duration, notified).await;
    });

    if let Ok(mut inbox) = connection.inbox.lock() {
        if let Some(payload) = inbox.frames.pop_front() {
            inbox.bytes = inbox.bytes.saturating_sub(payload.len());
            connection.capacity.notify_one();
            return Ok(Some(payload));
        }
    }
    Ok(None)
}

/// Close a connection by id.
#[uniffi::export]
fn close(connection_id: String) -> Result<(), IrohBridgeError> {
    with_state(|state| {
        if let Some(connection) = state.connections.remove(&connection_id) {
            connection.closed.store(true, Ordering::SeqCst);
            let _ = connection.close_tx.send(true);
            connection.notify.notify_one();
            connection.capacity.notify_waiters();
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

    fn test_guard() -> std::sync::MutexGuard<'static, ()> {
        TEST_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn test_endpoint_id() -> EndpointId {
        parse_endpoint_id("qv47olqig7hqpqqw73h6rl2vsusqzt4jdivhicnf2s5tssqlkria").unwrap()
    }

    #[test]
    fn test_bridge_version() {
        assert_eq!(bridge_version(), "0.2.0");
    }

    #[test]
    fn test_echo_roundtrip() {
        assert_eq!(echo_roundtrip("hello".to_string()), "echo: hello");
    }

    #[test]
    fn test_lifecycle() {
        let _guard = test_guard();
        stop();
        assert!(!is_running());
        start(None).expect("start should succeed");
        assert!(is_running());
        assert!(!node_id().is_empty());
        stop();
        assert!(!is_running());
        assert_eq!(node_id(), "");
    }

    #[test]
    fn test_invalid_connect_target_fails() {
        let _guard = test_guard();
        stop();
        start(Some(vec!["test-alpn/1".to_string()])).expect("start should succeed");
        let result = connect(
            "not-a-node".to_string(),
            "test-alpn/1".to_string(),
            None,
            None,
        );
        assert!(matches!(result, Err(IrohBridgeError::InvalidNodeId)));
        stop();
    }

    #[test]
    fn test_start_rejects_empty_alpn() {
        let _guard = test_guard();
        stop();
        let result = start(Some(vec!["".to_string()]));
        assert!(matches!(
            result,
            Err(IrohBridgeError::OperationFailed { message }) if message.contains("ALPN")
        ));
        stop();
    }

    #[test]
    fn test_endpoint_addr_requires_addressing_hint() {
        let result = endpoint_addr_from_hint(test_endpoint_id(), None);
        assert!(matches!(
            result,
            Err(IrohBridgeError::OperationFailed { message }) if message.contains("required")
        ));
    }

    #[test]
    fn test_endpoint_addr_rejects_display_only_relay_hint() {
        let result = endpoint_addr_from_hint(
            test_endpoint_id(),
            Some("iroh+relay://qv47olqig7hqpqqw73h6rl2vsusqzt4jdivhicnf2s5tssqlkria"),
        );
        assert!(matches!(
            result,
            Err(IrohBridgeError::OperationFailed { message }) if message.contains("did not include")
        ));
    }

    #[test]
    fn test_endpoint_addr_accepts_json_ticket_with_direct_addresses() {
        let result = endpoint_addr_from_hint(
            test_endpoint_id(),
            Some(
                r#"{"id":"qv47olqig7hqpqqw73h6rl2vsusqzt4jdivhicnf2s5tssqlkria","addrs":["127.0.0.1:38473"]}"#,
            ),
        );
        assert!(result.is_ok());
    }

    #[test]
    fn test_send_without_connection_fails() {
        let _guard = test_guard();
        let result = send("missing".to_string(), b"hello".to_vec());
        assert!(matches!(result, Err(IrohBridgeError::NotConnected)));
        assert!(!is_stream_open("missing".to_string()));
    }

    #[test]
    fn test_send_rejects_empty_and_oversized_frames_before_queueing() {
        assert!(matches!(
            send("missing".to_string(), Vec::new()),
            Err(IrohBridgeError::InvalidFrame)
        ));
        assert!(matches!(
            send(
                "missing".to_string(),
                vec![0u8; MAX_FRAME_BYTES as usize + 1],
            ),
            Err(IrohBridgeError::InvalidFrame)
        ));
    }

    #[test]
    fn test_frame_roundtrip_helpers() {
        let rt = RuntimeBuilder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        rt.block_on(async {
            let (mut client, mut server) = tokio::io::duplex(1024);
            write_frame(&mut client, b"{\"kind\":\"ping\"}")
                .await
                .unwrap();
            let frame = read_frame(&mut server).await.unwrap().unwrap();
            assert_eq!(frame, b"{\"kind\":\"ping\"}");
            assert!(matches!(
                write_frame(&mut client, &[]).await,
                Err(IrohBridgeError::InvalidFrame)
            ));
        });
    }

    #[test]
    fn test_reuses_one_quic_session_for_independent_streams() {
        let _guard = test_guard();
        const ALPN: &str = "iroh-rn-test/multiplex/1";
        stop();
        start(Some(vec![ALPN.to_string()])).expect("client endpoint should start");
        let runtime = with_state(|state| Ok(state.runtime.handle().clone())).unwrap();
        let server = runtime
            .block_on(async {
                Endpoint::builder(iroh::endpoint::presets::Minimal)
                    .relay_mode(RelayMode::Disabled)
                    .alpns(vec![ALPN.as_bytes().to_vec()])
                    .bind()
                    .await
                    .map_err(err)
            })
            .expect("server endpoint should start");
        let server_addr = server.addr();
        let hint = serde_json::json!({
            "id": server.id().to_z32(),
            "addrs": server_addr.addrs.iter().map(ToString::to_string).collect::<Vec<_>>(),
        })
        .to_string();
        assert!(
            !server_addr.addrs.is_empty(),
            "server should advertise direct addresses"
        );

        let server_task = runtime.spawn({
            let server = server.clone();
            async move {
                let incoming = server.accept().await.expect("one incoming QUIC session");
                let connection = incoming.await.expect("QUIC handshake");
                for _ in 0..2 {
                    let (mut send, mut recv) = connection.accept_bi().await.expect("stream");
                    let payload = read_frame(&mut recv)
                        .await
                        .expect("frame read")
                        .expect("frame");
                    write_frame(&mut send, &payload).await.expect("frame echo");
                    send.finish().expect("stream finish");
                    send.stopped()
                        .await
                        .expect("peer should acknowledge echoed frame");
                }
            }
        });

        let first = connect(
            server.id().to_z32(),
            ALPN.to_string(),
            Some(hint.clone()),
            Some(2_000),
        )
        .expect("first stream");
        let second = connect(
            server.id().to_z32(),
            ALPN.to_string(),
            Some(hint),
            Some(2_000),
        )
        .expect("second stream");
        send(first.clone(), b"control".to_vec()).expect("first send");
        send(second.clone(), b"transfer".to_vec()).expect("second send");
        assert_eq!(
            next_message(first.clone(), 2_000).expect("first receive"),
            Some(b"control".to_vec())
        );
        assert_eq!(
            next_message(second.clone(), 2_000).expect("second receive"),
            Some(b"transfer".to_vec())
        );

        close(first).unwrap();
        close(second).unwrap();
        runtime.block_on(server_task).expect("server task");
        runtime.block_on(server.close());
        stop();
    }
}

uniffi::setup_scaffolding!();
