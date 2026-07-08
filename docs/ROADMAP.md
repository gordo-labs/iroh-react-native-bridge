# Roadmap

## 0.1.x - Alpha

- Keep API intentionally small.
- Prove real-device iOS and Android connectivity.
- Improve diagnostics for native linking and address-hint failures.
- Add public docs and contribution templates.
- Stabilize Music Hub dogfood use case.

## 0.2.x - Developer Usability

- Add a public example app.
- Add CI package validation for npm tarball contents.
- Add smoke tests for generated JS wrapper behavior.
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
- Music library logic.
- File/blob sync.
- A complete React Native wrapper around every Iroh feature.
