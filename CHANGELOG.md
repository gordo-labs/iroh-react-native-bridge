# Changelog

This project follows semantic versioning after 1.0. During 0.x, minor and patch
versions may still include API or packaging changes.

## Unreleased

- Added public open-source documentation, support policy, security policy,
  roadmap, and GitHub contribution templates.
- Added CI package dry-run validation.

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

- Initial npm package publication.
- Minimal Iroh endpoint lifecycle and framed connection API.
