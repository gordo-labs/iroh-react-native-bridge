//! Local TCP forwarder: every TCP connection accepted on a loopback port gets its own
//! bidirectional QUIC stream on the shared peer session (the pattern of n0's `dumbpipe`).
//!
//! Independent streams remove head-of-line blocking between unrelated transfers: a large
//! download on one connection never delays a small request on another. Bytes are pumped in
//! native code; nothing crosses the JavaScript bridge. An optional preamble is written at the
//! start of each stream so the remote side can tell forwarded streams from other traffic.

use std::{
    collections::HashMap,
    net::{Ipv4Addr, SocketAddr},
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};

use iroh::{endpoint::Connection, EndpointAddr};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    sync::watch,
    task::JoinSet,
    time,
};

use super::{
    cache_session, endpoint_addr_from_hint, endpoint_addr_from_typed_target, err,
    normalize_alpn, open_bi_with_timeout, parse_endpoint_id, session_key, with_state,
    IrohBridgeError, NEXT_SESSION_USE, DEFAULT_CONNECT_TIMEOUT_MS,
};

/// A gap longer than this between received chunks ends a transfer burst for the stats.
const BURST_IDLE_GAP: Duration = Duration::from_millis(250);
const MAX_PREAMBLE_BYTES: usize = 4 * 1024;
const COPY_BUFFER_BYTES: usize = 64 * 1024;

static NEXT_FORWARDER_ID: AtomicU64 = AtomicU64::new(1);

/// Where and how to forward.
#[derive(uniffi::Record)]
pub struct TcpForwarderOptions {
    /// Remote endpoint id (z-base-32). Required unless `endpoint_ticket` is given.
    pub node_id: Option<String>,
    pub alpn: String,
    /// Legacy free-form address hint, as accepted by `connect`.
    pub address_hint: Option<String>,
    /// Typed target, as accepted by `connect_target`: "endpoint-ticket" or "endpoint-address".
    pub target_kind: Option<String>,
    pub endpoint_ticket: Option<String>,
    pub direct_addresses: Option<Vec<String>>,
    pub relay_url: Option<String>,
    /// Loopback port to listen on; 0 picks a free one.
    pub listen_port: u16,
    /// Bytes written at the start of every forwarded stream.
    pub preamble: Option<Vec<u8>>,
    pub timeout_ms: Option<u32>,
}

#[derive(uniffi::Record)]
pub struct TcpForwarderInfo {
    pub id: String,
    pub port: u16,
}

/// Counters since the forwarder started. `active_down_ms` only counts time while data was
/// arriving (bursts across all connections), so `bytes_down * 8 / active_down_ms` is the
/// route throughput in kbit/s.
#[derive(uniffi::Record, Clone, Default, Debug, PartialEq)]
pub struct TcpForwarderStats {
    pub active_connections: u32,
    pub total_connections: u64,
    pub failed_streams: u64,
    pub bytes_up: u64,
    pub bytes_down: u64,
    pub active_down_ms: u64,
}

#[derive(Default)]
struct StatsState {
    stats: TcpForwarderStats,
    last_down_at: Option<Instant>,
}

impl StatsState {
    fn record_down(&mut self, bytes: usize, now: Instant) {
        if let Some(previous) = self.last_down_at {
            let gap = now.saturating_duration_since(previous);
            if gap <= BURST_IDLE_GAP {
                self.stats.active_down_ms += gap.as_millis() as u64;
            }
        }
        self.last_down_at = Some(now);
        self.stats.bytes_down += bytes as u64;
    }
}

pub(crate) struct ManagedForwarder {
    stop_tx: watch::Sender<bool>,
    stats: Arc<Mutex<StatsState>>,
}

pub(crate) type Forwarders = HashMap<String, ManagedForwarder>;

fn forwarders() -> &'static Mutex<Forwarders> {
    static FORWARDERS: std::sync::OnceLock<Mutex<Forwarders>> = std::sync::OnceLock::new();
    FORWARDERS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn resolve_target(options: &TcpForwarderOptions) -> Result<EndpointAddr, IrohBridgeError> {
    if let Some(kind) = options.target_kind.as_deref() {
        return endpoint_addr_from_typed_target(
            kind,
            options.node_id.as_deref(),
            options.endpoint_ticket.as_deref(),
            options.direct_addresses.clone(),
            options.relay_url.as_deref(),
        );
    }
    let node_id = options
        .node_id
        .as_deref()
        .ok_or_else(|| err("node_id or target_kind is required"))?;
    endpoint_addr_from_hint(parse_endpoint_id(node_id)?, options.address_hint.as_deref())
}

/// The cached session for this peer and ALPN, or a new one (cached for later streams).
async fn session(
    endpoint: &iroh::endpoint::Endpoint,
    addr: &EndpointAddr,
    alpn: &[u8],
    timeout: Duration,
) -> Result<Connection, IrohBridgeError> {
    let key = session_key(&addr.id, alpn);
    let cached = with_state(|state| {
        Ok(state.sessions.get_mut(&key).and_then(|session| {
            if session.connection.close_reason().is_some() {
                None
            } else {
                session.last_used = NEXT_SESSION_USE.fetch_add(1, Ordering::Relaxed);
                Some(session.connection.clone())
            }
        }))
    })?;
    if let Some(connection) = cached {
        return Ok(connection);
    }
    let connection = time::timeout(timeout, endpoint.connect(addr.clone(), alpn))
        .await
        .map_err(|_| err("Iroh connect timed out"))?
        .map_err(err)?;
    with_state(|state| {
        cache_session(state, key, connection.clone());
        Ok(())
    })?;
    Ok(connection)
}

async fn pump(
    tcp: TcpStream,
    endpoint: iroh::endpoint::Endpoint,
    addr: EndpointAddr,
    alpn: Vec<u8>,
    preamble: Arc<Vec<u8>>,
    timeout: Duration,
    stats: Arc<Mutex<StatsState>>,
) -> Result<(), IrohBridgeError> {
    let connection = session(&endpoint, &addr, &alpn, timeout).await?;
    let (mut send, mut recv) = open_bi_with_timeout(&connection, timeout).await?;
    if !preamble.is_empty() {
        send.write_all(&preamble).await.map_err(err)?;
    }
    let _ = tcp.set_nodelay(true);
    let (mut tcp_read, mut tcp_write) = tcp.into_split();

    let up_stats = stats.clone();
    let upstream = async move {
        let mut buf = vec![0u8; COPY_BUFFER_BYTES];
        loop {
            let n = tcp_read.read(&mut buf).await.map_err(err)?;
            if n == 0 {
                // Local side finished its request body: half-close the stream.
                let _ = send.finish();
                return Ok::<(), IrohBridgeError>(());
            }
            send.write_all(&buf[..n]).await.map_err(err)?;
            if let Ok(mut state) = up_stats.lock() {
                state.stats.bytes_up += n as u64;
            }
        }
    };
    let downstream = async move {
        let mut buf = vec![0u8; COPY_BUFFER_BYTES];
        loop {
            let n = match recv.read(&mut buf).await.map_err(err)? {
                Some(n) => n,
                None => {
                    let _ = tcp_write.shutdown().await;
                    return Ok::<(), IrohBridgeError>(());
                }
            };
            if let Ok(mut state) = stats.lock() {
                state.record_down(n, Instant::now());
            }
            tcp_write.write_all(&buf[..n]).await.map_err(err)?;
        }
    };
    // The response side decides the end of the exchange; a local reader that keeps its
    // write half open (HTTP keep-alive) must not hold the stream open after the peer is done.
    let (up, down) = tokio::join!(upstream, downstream);
    down.and(up)
}

/// Listen on 127.0.0.1 and forward every accepted TCP connection over its own QUIC stream.
#[uniffi::export]
pub fn start_tcp_forwarder(
    options: TcpForwarderOptions,
) -> Result<TcpForwarderInfo, IrohBridgeError> {
    let addr = resolve_target(&options)?;
    let alpn = normalize_alpn(&options.alpn)?;
    let preamble = Arc::new(options.preamble.clone().unwrap_or_default());
    if preamble.len() > MAX_PREAMBLE_BYTES {
        return Err(err("preamble is too large"));
    }
    let timeout = Duration::from_millis(
        options
            .timeout_ms
            .map(u64::from)
            .filter(|value| *value > 0)
            .unwrap_or(DEFAULT_CONNECT_TIMEOUT_MS),
    );
    let (endpoint, runtime) = with_state(|state| {
        let endpoint = state.endpoint.clone().ok_or(IrohBridgeError::NotStarted)?;
        Ok((endpoint, state.runtime.handle().clone()))
    })?;

    let listener = runtime.block_on(async {
        TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, options.listen_port)))
            .await
            .map_err(err)
    })?;
    let port = listener.local_addr().map_err(err)?.port();
    let id = format!("tcp-forwarder-{}", NEXT_FORWARDER_ID.fetch_add(1, Ordering::SeqCst));
    let (stop_tx, mut stop_rx) = watch::channel(false);
    let stats = Arc::new(Mutex::new(StatsState::default()));

    let loop_stats = stats.clone();
    runtime.spawn(async move {
        let mut tasks = JoinSet::new();
        loop {
            tokio::select! {
                changed = stop_rx.changed() => {
                    if changed.is_err() || *stop_rx.borrow() {
                        break;
                    }
                }
                accepted = listener.accept() => {
                    let Ok((tcp, _peer)) = accepted else { continue; };
                    if let Ok(mut state) = loop_stats.lock() {
                        state.stats.total_connections += 1;
                        state.stats.active_connections += 1;
                    }
                    let stats = loop_stats.clone();
                    let endpoint = endpoint.clone();
                    let addr = addr.clone();
                    let alpn = alpn.clone();
                    let preamble = preamble.clone();
                    tasks.spawn(async move {
                        let result =
                            pump(tcp, endpoint, addr, alpn, preamble, timeout, stats.clone()).await;
                        if let Ok(mut state) = stats.lock() {
                            state.stats.active_connections =
                                state.stats.active_connections.saturating_sub(1);
                            if result.is_err() {
                                state.stats.failed_streams += 1;
                            }
                        }
                    });
                }
                Some(_) = tasks.join_next(), if !tasks.is_empty() => {}
            }
        }
        // Stopping drops the listener and aborts every open connection.
        tasks.abort_all();
        if let Ok(mut state) = loop_stats.lock() {
            state.stats.active_connections = 0;
        }
    });

    forwarders()
        .lock()
        .map_err(|_| IrohBridgeError::InternalError)?
        .insert(id.clone(), ManagedForwarder { stop_tx, stats });
    Ok(TcpForwarderInfo { id, port })
}

/// Stop listening and close every connection of this forwarder. Unknown ids are ignored.
#[uniffi::export]
pub fn stop_tcp_forwarder(id: String) {
    if let Ok(mut map) = forwarders().lock() {
        if let Some(forwarder) = map.remove(&id) {
            let _ = forwarder.stop_tx.send(true);
        }
    }
}

#[uniffi::export]
pub fn tcp_forwarder_stats(id: String) -> Result<TcpForwarderStats, IrohBridgeError> {
    let map = forwarders().lock().map_err(|_| IrohBridgeError::InternalError)?;
    let forwarder = map.get(&id).ok_or(IrohBridgeError::NotConnected)?;
    let stats = forwarder
        .stats
        .lock()
        .map_err(|_| IrohBridgeError::InternalError)?
        .stats
        .clone();
    Ok(stats)
}

/// Stops every forwarder (used when the endpoint stops).
pub(crate) fn stop_all_tcp_forwarders() {
    if let Ok(mut map) = forwarders().lock() {
        for (_, forwarder) in map.drain() {
            let _ = forwarder.stop_tx.send(true);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn burst_stats_count_only_time_while_data_flows() {
        let mut state = StatsState::default();
        let t0 = Instant::now();
        state.record_down(1000, t0);
        state.record_down(1000, t0 + Duration::from_millis(100));
        state.record_down(1000, t0 + Duration::from_millis(200));
        // A long idle gap starts a new burst without adding the gap.
        state.record_down(1000, t0 + Duration::from_millis(5_200));
        state.record_down(1000, t0 + Duration::from_millis(5_300));
        assert_eq!(state.stats.bytes_down, 5000);
        assert_eq!(state.stats.active_down_ms, 300);
    }
}
