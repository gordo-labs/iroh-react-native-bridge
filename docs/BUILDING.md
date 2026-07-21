# Building

This document describes local source builds for contributors.

## Requirements

- Node.js 22 or newer.
- Rust stable.
- Xcode and CocoaPods for iOS.
- Android Studio, Android SDK, and NDK for Android.
- `cargo-ndk` (`cargo install cargo-ndk`) for Android Rust cross-compiles.
- A React Native app that uses a development client or native build. Expo Go
  cannot load custom native modules.

`npm run ubrn:android` / `npm run ubrn:ios` force the active rustup toolchain
(not Homebrew rust) via `scripts/with-native-build-env.mjs`. The Android script
also auto-detects `ANDROID_HOME` / `ANDROID_NDK_HOME` from Homebrew
`android-commandlinetools` (`/opt/homebrew/share/android-commandlinetools`) or
`~/Library/Android/sdk`. Override either variable if needed.

This repo uses
[`uniffi-bindgen-react-native`](https://github.com/jhugman/uniffi-bindgen-react-native)
for generated React Native bindings. The npm packages currently involved are:

- `uniffi-bindgen-react-native` for the `ubrn` CLI and compatibility runtime.
- `@ubjs/core` for generated JavaScript runtime imports.

## Rust Tests

```bash
cd rust/iroh_mobile_bridge
cargo test
```

## Package Dry Run

```bash
cd react-native
npm pack --dry-run
```

This verifies that the npm package includes the expected source, native
artifacts, podspec, Gradle files, README, and license.

## Regenerate Native Artifacts

Only regenerate native artifacts when Rust exports, UniFFI config, or Iroh
native dependencies change.

```bash
cd react-native
npm run ubrn:ios
npm run ubrn:android
```

After regenerating artifacts:

1. Inspect generated source changes.
2. Compare unexpected generator/runtime changes against
   `jhugman/uniffi-bindgen-react-native`; upstream fixes are preferred for
   generator defects.
3. Confirm `ReactNativeIrohBridgeFramework.xcframework` exists.
4. Confirm Android `jniLibs` contains the expected ABIs.
5. Re-run `npm pack --dry-run`.
6. Test in a real React Native app.

## Local App Integration

Use a local file dependency while developing:

```json
{
  "dependencies": {
    "@gordo-labs/react-native-iroh": "file:../iroh-react-native-bridge/react-native"
  }
}
```

Then reinstall and rebuild the native app:

```bash
npm install
npx pod-install ios
npx expo run:ios
npx expo run:android
```

If the package is symlinked, Metro may pick up JS changes without reinstalling,
but native changes always require a native rebuild.

## Publishing Checklist

Before publishing a new npm version:

1. Update `react-native/package.json` version.
2. Update [CHANGELOG.md](../CHANGELOG.md).
3. Run Rust tests.
4. Run `npm pack --dry-run` from `react-native/`.
5. Install the packed tarball in a sample app.
6. Test iOS and Android native startup.
7. Tag the release in Git after publish.
