# iroh_mobile_bridge

Rust crate used by `@gordo-labs/react-native-iroh`.

It owns the Iroh endpoint lifecycle and exports a small UniFFI/JSI-compatible
API for React Native:

- `bridge_version`
- `start`
- `stop`
- `is_running`
- `node_id`
- `connect` (opens a new stream and reuses the peer's QUIC session)
- `send`
- `is_stream_open`
- `next_message`
- `close`

The crate uses a length-prefixed binary frame format over independent Iroh
bidirectional streams. Calls for the same peer and ALPN reuse a bounded cache of
QUIC sessions. Send/receive queues are bounded and a slow JavaScript consumer
activates QUIC backpressure. It does not implement host app authentication,
pairing, HTTP tunneling, or user/session logic.

## Test

```bash
cargo test
```

## Android

Android endpoint startup requires JNI context initialization before Iroh creates
its endpoint. The exported `react_native_iroh_init_android_context` function is
called by the Android native module before installing the Rust JSI runtime.

## Dialing

Mobile dialing currently requires an address hint. A bare node id or
display-only relay id is rejected because it does not contain enough information
to open the connection reliably.
