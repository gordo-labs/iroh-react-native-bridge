# Contributing

Thanks for helping improve `iroh-react-native-bridge`.

This project is alpha infrastructure. Good contributions should either make the
existing bridge more reliable or make its current limits easier to understand.
Large API additions are welcome as proposals first, not surprise PRs.

## Before Opening Work

1. Check existing issues and PRs.
2. Read [docs/STATUS.md](./docs/STATUS.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
3. Open an issue for platform bugs, build failures, or API proposals.
4. Include the app type you tested with: Expo dev client, bare React Native, EAS
   build, local Xcode/Gradle build, iOS simulator, Android emulator, or physical
   device.
5. For generated-code changes, check [docs/UPSTREAM.md](./docs/UPSTREAM.md) and
   confirm whether the fix belongs in this bridge or upstream in
   `jhugman/uniffi-bindgen-react-native`.

## Development Setup

Requirements:

- Node.js 22 or newer for package tooling.
- Rust stable.
- Xcode for iOS builds.
- Android Studio, NDK, and a configured Android SDK for Android builds.
- CocoaPods for local iOS integration.

Useful commands:

```bash
cd rust/iroh_mobile_bridge
cargo test

cd ../../react-native
npm ci
npm run test:source
npm run ubrn:ios
npm run ubrn:android
npm run verify:release
```

The generated native artifacts are large. If your change does not require a new
binary artifact, avoid regenerating them. `verify:release` is for maintainers
with both artifact sets present; source-only contributions should run
`test:source`. See [docs/RELEASING.md](./docs/RELEASING.md).

## Pull Request Expectations

Every PR should include:

- What changed and why.
- Platforms tested.
- Commands run.
- Device model and OS version for native/runtime changes.
- Logs or screenshots for connection fixes.
- Any known risks or follow-up work.

For native changes, include at least one of:

- `cargo test` output.
- A successful iOS app build that links the package.
- A successful Android app build that links the package.
- A minimal reproduction showing why CI cannot cover the case.

## API Guidelines

- Keep the public JavaScript API small.
- Prefer explicit errors over silent fallbacks.
- Do not hide native-linking failures behind fake success states.
- Do not add app-specific authorization to the bridge. The host application owns
  pairing, identity, and message authorization.
- Preserve binary frame semantics. Higher-level HTTP or RPC tunneling belongs in
  host apps or separate packages.
- Prefer upstream fixes in `uniffi-bindgen-react-native` when the problem is
  generator/runtime behavior rather than this bridge's Iroh transport logic.

## Issue Quality

For connection issues, include:

- Platform: iOS or Android.
- Device or simulator/emulator.
- React Native version.
- Expo version, if used.
- Package version or commit SHA.
- Whether the package was installed from npm or a local `file:` dependency.
- The remote peer type and how its address hint was produced.
- Full error logs from the first failure, not only the final UI state.

## Code of Conduct

Participation in this repository is covered by [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
