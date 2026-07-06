# @music-hub/iroh-bridge

React Native package for the Music Hub Iroh mobile bridge.

This package exposes the `IrohBridge` TurboModule to React Native autolinking
on iOS and Android. The TurboModule installs the Rust/UniFFI JSI runtime and
`src/index.js` then calls the generated Rust bindings directly.

`MusicHubIroh` is kept only as a legacy compatibility shell. If the package falls
back to that module, the app is not running the real Iroh runtime.

Expected mobile behavior:

- `Iroh native bridge is not installed in this mobile build`: the package was
  not included by the app build.
- `Iroh native bridge runtime is not available` / TurboModule errors: rebuild
  the native app after `npm install` + `pod install`; ensure the New
  Architecture/TurboModule path is enabled for this package.
- `Iroh Rust runtime is not linked into this ... build yet`: the app fell back
  to the legacy `MusicHubIroh` shell instead of loading `IrohBridge`.

Local development:

1. Build Rust artifacts with `npm run ubrn:ios` or `npm run ubrn:android`.
2. In the mobile app, use `music-hub-iroh-bridge: file:../iroh-react-native-bridge/react-native`.
3. Re-run `npm install`, iOS pods, and rebuild the native app.
