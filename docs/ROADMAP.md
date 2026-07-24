# Roadmap

## 0.1.x - Initial Alpha

- Keep API intentionally small.
- Prove real-device iOS and Android connectivity.
- Improve diagnostics for native linking and address-hint failures.
- Add public docs and contribution templates.
- Stabilize dogfood use in at least one real React Native app.

## 0.2.x - Multiplexing and Developer Usability

- Reusable peer sessions with independent QUIC streams. ✅
- Bounded queues, backpressure, and stream cancellation. ✅
- Logical `openSession()` JavaScript API. ✅
- Public GitHub source + PR #1 merged to `main`. ✅
- CI source/package safety and native release artifact validation. ✅
- Smoke tests for generated JS wrapper behavior. ✅
- Repeatable maintainer release procedure and npm provenance metadata. ✅

- First public npm publish of `@gordo-labs/react-native-iroh@0.2.0`.
- Add a public example app.
- Document exact React Native and Expo version matrix.
- Add release scripts for native artifact regeneration.
- Track `uniffi-bindgen-react-native` generator releases and remove local
  generator patches when upstream fixes land.

## 0.3.x - Interop Hardening

- More NAT/relay reports.
- Clearer address/ticket model.
- Better connection close/error propagation.
- Optional async iterator receive API.
- Larger payload soak tests.

## 1.0 - Stable

- Freeze the public JS API.
- Publish full compatibility matrix.
- Commit to semver for breaking API changes.
- Provide example app and tested release procedure.
- Define maintenance policy for Iroh crate bumps.

## Out Of Scope For This Package

- App pairing.
- User authentication.
- HTTP tunneling.
- Application domain logic (libraries, media, UI).
- File/blob sync.
- A complete React Native wrapper around every Iroh feature.
