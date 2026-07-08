# iroh_mobile_bridge

Rust crate used by `@gordo-labs/react-native-iroh`.

It owns the Iroh endpoint lifecycle and exports a small UniFFI/JSI-compatible
API for React Native:

- `bridge_version`
- `start`
- `stop`
- `is_running`
- `node_id`
- `connect`
- `send`
- `next_message`
- `close`

The crate uses a length-prefixed binary frame format over an Iroh bidirectional
stream. It does not implement host app authentication, pairing, HTTP tunneling,
or user/session logic.

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
