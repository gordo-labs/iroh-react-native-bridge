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
- `connect_target` (typed official endpoint ticket or explicit endpoint address)
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

Mobile dialing requires usable addressing. New callers should use
`connect_target` with either a canonical `iroh-tickets::EndpointTicket` string
or an endpoint id plus direct socket addresses and/or a relay URL. The legacy
`connect` export remains available for source compatibility.

The parser rejects malformed addresses, tickets without addresses, ambiguous
typed targets, and legacy JSON tickets that claim an endpoint id different from
the requested peer. It never silently drops an invalid address.
