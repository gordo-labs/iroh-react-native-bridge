//! iroh_mobile_bridge — Minimal Iroh endpoint for React Native via UniFFI.
//!
//! Exposes: node_id, start, stop, echo_roundtrip.
//! Sovereign Remote Phase P1: prove Rust + UniFFI + Iroh baseline works.

use std::sync::Mutex;

static NODE_ID: Mutex<Option<String>> = Mutex::new(None);
static STARTED: Mutex<bool> = Mutex::new(false);

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum IrohBridgeError {
    #[error("Iroh endpoint is already started")]
    AlreadyStarted,
    #[error("Iroh endpoint is not started")]
    NotStarted,
    #[error("Failed to create Iroh endpoint")]
    EndpointCreationFailed,
    #[error("Internal error")]
    InternalError,
}

/// Returns the version of this bridge module.
#[uniffi::export]
fn bridge_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Returns the Iroh node id (public key) as a hex string.
/// Returns empty string if the node is not started.
#[uniffi::export]
fn node_id() -> String {
    NODE_ID.lock().unwrap().clone().unwrap_or_default()
}

/// Start the Iroh endpoint.
#[uniffi::export]
fn start() -> Result<(), IrohBridgeError> {
    let mut started = STARTED.lock().unwrap();
    if *started {
        return Err(IrohBridgeError::AlreadyStarted);
    }

    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|_e| IrohBridgeError::EndpointCreationFailed)?;

    let secret_key = iroh::SecretKey::generate();
    let node_id_str = hex::encode(secret_key.public().as_bytes());

    // Create endpoint with minimal preset
    let _endpoint = rt.block_on(async {
        iroh::endpoint::Endpoint::builder(iroh::endpoint::presets::Minimal)
            .secret_key(secret_key)
            .bind()
            .await
    }).map_err(|_e| IrohBridgeError::EndpointCreationFailed)?;

    *NODE_ID.lock().unwrap() = Some(node_id_str);
    *started = true;

    Ok(())
}

/// Stop the Iroh endpoint.
#[uniffi::export]
fn stop() {
    *NODE_ID.lock().unwrap() = None;
    *STARTED.lock().unwrap() = false;
}

/// Returns true if the endpoint is running.
#[uniffi::export]
fn is_running() -> bool {
    *STARTED.lock().unwrap()
}

/// Echo a string — proves UniFFI + Iroh baseline works.
#[uniffi::export]
fn echo_roundtrip(input: String) -> String {
    format!("echo: {}", input)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bridge_version() {
        let version = bridge_version();
        assert_eq!(version, "0.1.0");
    }

    #[test]
    fn test_echo_roundtrip() {
        let result = echo_roundtrip("hello".to_string());
        assert_eq!(result, "echo: hello");
    }

    #[test]
    fn test_not_running_initially() {
        assert!(!is_running());
    }

    #[test]
    fn test_node_id_empty_initially() {
        assert_eq!(node_id(), "");
    }

    #[test]
    fn test_start_stop_lifecycle() {
        assert!(!is_running());
        start().expect("start should succeed");
        assert!(is_running());
        assert!(!node_id().is_empty());
        stop();
        assert!(!is_running());
        assert_eq!(node_id(), "");
    }

    #[test]
    fn test_start_twice_fails() {
        start().expect("first start");
        let result = start();
        assert!(result.is_err());
        stop();
    }
}

uniffi::setup_scaffolding!();
