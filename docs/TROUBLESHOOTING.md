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

## Android/iOS build: `can't find crate for core` / target may not be installed

Homebrew `rust`/`cargo` are often first on PATH but have no iOS/Android std.
`npm run ubrn:android` and `npm run ubrn:ios` force the active **rustup**
toolchain via `scripts/with-native-build-env.mjs`.

If it still fails:

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android
```

## Android build: `Could not find any NDK`

`cargo-ndk` needs `ANDROID_NDK_HOME`. Prefer:

```bash
cd react-native
npm run ubrn:android
```

That script wraps `ubrn` with `scripts/with-native-build-env.mjs --android`, which
picks the newest side-by-side NDK under Homebrew or Android Studio SDK roots.

Manual override:

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/27.1.12297006
npm run ubrn:android
```

## Android: `android context was not initialized`

The Rust Iroh runtime needs Android JNI context before endpoint startup.

Check:

- You are using a package version that includes Android context initialization.
- The native app was rebuilt.
- The package's Android native module was autolinked.

## iOS archive: `Undefined symbols` for `uniffi_iroh_mobile_bridge_*connect_target`

`ubrn:generate` refreshes C++/JS bindings from the host Rust library. It does
not rebuild `ReactNativeIrohBridgeFramework.xcframework`. If a new UniFFI
export such as `connect_target` lands in generated C++ while the xcframework is
still the previous binary, Xcode archive fails at link:

```
Undefined symbols for architecture arm64:
  "_uniffi_iroh_mobile_bridge_fn_func_connect_target"
  "_uniffi_iroh_mobile_bridge_checksum_func_connect_target"
```

Rebuild the iOS slice after any new Rust export:

```bash
cd react-native
npm run ubrn:ios
```

Music Hub's `npm run ios:build:submit` now runs this check before `xcodebuild`
and rebuilds the xcframework when the device library is stale.

## Android CMake: undefined `uniffi_iroh_mobile_bridge_*connect_target`

The same host-only `ubrn:generate` leftover affects Android. CMake links
generated C++ against `android/src/main/jniLibs/*/libiroh_mobile_bridge.so`.
If that `.so` is older than the C++ bindings, Ninja fails with:

```
undefined reference to `uniffi_iroh_mobile_bridge_fn_func_connect_target`
undefined reference to `uniffi_iroh_mobile_bridge_checksum_func_connect_target`
```

Rebuild every JNI ABI after any new Rust export:

```bash
cd react-native
npm run ubrn:android
```

Music Hub's `npm run android:build:submit` now runs this check before Gradle
and rebuilds jniLibs when any ABI is stale.

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
