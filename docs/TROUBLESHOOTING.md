# Troubleshooting

## `IrohBridge TurboModule is not installed`

The native package is not available to JavaScript.

Check:

- You are using a native app build or Expo dev client, not Expo Go.
- `@gordo-labs/react-native-iroh` is installed.
- iOS pods were installed after adding the package.
- The app binary was rebuilt after installing the package.
- Metro cache was cleared after switching between local and npm packages.

## `Iroh Rust runtime is not linked into this build yet`

The app loaded the legacy compatibility shell instead of the generated JSI
runtime.

Check:

- The app is using the current package version.
- The native binary was rebuilt after dependency changes.
- iOS is linking `IrohBridge.podspec`.
- Android autolinking includes `IrohBridgePackage`.

## `Iroh addressing hint is required`

The remote node id alone is not enough for mobile dialing in the current bridge.
Pass a usable address hint produced by the remote peer.

Valid hints include:

- A direct socket address.
- A relay URL that can be parsed as an Iroh transport address.
- A JSON ticket-like payload with `id` and non-empty `addrs`.

Display-only values such as `iroh+relay://<node-id>` are rejected because they do
not contain enough dialing information.

## `No addressing information available`

The remote peer did not publish usable direct addresses or relay addressing.
Fix the remote peer/presence publisher before retrying from mobile.

## Android: `android context was not initialized`

The Rust Iroh runtime needs Android JNI context before endpoint startup.

Check:

- You are using a package version that includes Android context initialization.
- The native app was rebuilt.
- The package's Android native module was autolinked.

## iOS: bridge works in JS but not in a TestFlight/build

Check:

- The installed binary was produced after the bridge package was added.
- The app target links `IrohBridge`.
- The build includes `ReactNativeIrohBridgeFramework.xcframework`.
- The JS bundle and native binary are from matching package versions.

## Connection Opens But App Protocol Fails

The bridge only transports framed bytes. If an app-level protocol fails after
Iroh connects, inspect the host app's protocol:

- Does it perform its session verification handshake?
- Are messages encoded as the remote peer expects?
- Are binary frames being double-framed?
- Is the remote peer using the same ALPN/protocol path?

## Reporting Issues

Use the bug report template and include:

- Platform and device.
- React Native and Expo versions.
- Package version or commit SHA.
- Native build method.
- Full logs from the first failure.
- The remote peer's advertised node id and address hint shape, with secrets
  removed.
