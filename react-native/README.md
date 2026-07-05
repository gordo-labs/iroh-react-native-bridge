# @music-hub/iroh-bridge

React Native package for the Music Hub Iroh mobile bridge.

This package exposes the native module name `MusicHubIroh` to React Native
autolinking on iOS and Android. The current implementation is a loadable shell:
it lets the mobile app detect that the native module is present and returns an
explicit `iroh_not_linked` error until the Rust Iroh runtime is linked into the
platform targets.

Expected mobile behavior:

- `Iroh native bridge is not installed in this mobile build`: the package was
  not included by the app build.
- `Iroh Rust runtime is not linked into this ... build yet`: the React Native
  module is present, but the Rust/UniFFI runtime has not been wired yet.

Next native step:

1. Build the Rust crate as iOS and Android artifacts.
2. Generate UniFFI Swift and Kotlin bindings.
3. Replace the shell `start`, `nodeId`, `connect`, `send`, `close`, and `stop`
   implementations with calls into the Rust runtime.
