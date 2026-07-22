# Changelog

This project follows semantic versioning after 1.0. During 0.x, minor and patch
versions may still include API or packaging changes.

## Unreleased

- Added public open-source documentation, support policy, security policy,
  roadmap, and GitHub contribution templates.
- Added CI gates for Rust formatting, Clippy, tests, JavaScript package tests,
  dependency audit, generic-scope validation, and tracked-file safety.
- Added release validation for npm/Cargo version parity and required iOS and
  Android native artifacts.
- Added npm provenance/public-access metadata and a maintainer release procedure.
- Added the missing Android Gradle Plugin 7.3+ manifest to the package allowlist.
- Documented that the first public npm release is still pending.

## 0.2.0

- Reuse one QUIC session per peer and ALPN while opening an independent
  bidirectional stream for every `connect()` call.
- Added the `openSession()` / `openStream()` JavaScript ownership API without
  breaking the original `connect()` API.
- Added bounded native send and receive queues, receive-side QUIC backpressure,
  ordered asynchronous JS sends, deterministic stream cancellation, and
  multicast message listeners.
- Added session cache eviction and automatic redial when a cached QUIC session
  has closed.

## 0.1.2

- Enabled Iroh `RelayMode::Default` on endpoint start so dials work off-LAN
  (previously `presets::Minimal` left relays disabled; only same-LAN direct
  addrs succeeded).
- Regenerated Android `jniLibs` and iOS xcframework with the relay fix.
- Added `scripts/with-native-build-env.mjs` so `ubrn:android` / `ubrn:ios`
  force rustup (not Homebrew rust) and auto-detect Android NDK.

## 0.1.1

- Added generated React Native bridge packaging for iOS and Android.
- Included native iOS and Android binary artifacts in the npm package.
- Added Android JNI context initialization before Iroh endpoint startup.
- Improved native bridge resolution across Android and iOS module names.
- Rejected unusable display-only Iroh hints before dialing.
- Preserved native runtime errors for app-level diagnostics.

## 0.1.0

- Initial npm package implementation.
- Minimal Iroh endpoint lifecycle and framed connection API.
