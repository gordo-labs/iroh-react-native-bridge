# TASK - Iroh React Native Bridge

## Objective

Provide a small, reusable React Native package that lets iOS and Android apps
open Iroh encrypted sessions without a Node runtime.

The bridge is intentionally narrow: endpoint lifecycle, node id, outbound
connection, framed binary send/receive, and clear native-linking errors.

## Current Status

Alpha implementation is active.

Completed:

- Independent repo and GitHub remote.
- Rust crate using `iroh` 1.x.
- UniFFI/JSI generated runtime.
- React Native TurboModule package.
- Android `.so` artifacts.
- iOS `.xcframework` artifact.
- npm package `@gordo-labs/react-native-iroh`.
- Music Hub local integration via `file:` dependency.
- Desktop/mobile tunnel smoke coverage in Music Hub tests.
- `jhugman/uniffi-bindgen-react-native` documented as the upstream generator
  and preferred target for generator/runtime fixes.
- `RelayMode::Default` so mobile can dial via n0 relays off-LAN (0.1.2).
- Build helpers that prefer rustup + auto-detect Homebrew NDK.
- Real-device Android QA with Music Hub Sovereign playback (2026-07-21).

Still required before stable:

- Public example app.
- Repeatable release procedure for regenerated native artifacts.
- Broader real-device matrix.
- More CI coverage for package validation.
- API freeze and semver policy.

## API Surface

| Method | Purpose |
| --- | --- |
| `bridgeVersion()` | Runtime version diagnostics |
| `nodeId()` | Local Iroh endpoint id after start |
| `start()` / `stop()` | Endpoint lifecycle |
| `isRunning()` | Native endpoint state |
| `connect(nodeId, addressHint)` | Dial a remote Iroh endpoint |
| `connection.send(bytes)` | Send one framed binary message |
| `connection.onMessage(cb)` | Receive framed binary messages |
| `connection.close()` | Close the native connection |

## Non-goals

- A full general-purpose Iroh SDK.
- App-level authentication or pairing.
- Music Hub HTTP tunnel logic.
- Content storage, blobs, sync, or provider APIs.
- A hidden fallback that pretends Iroh is connected when native linking failed.

## Acceptance For 1.0

1. iOS physical device can connect to a known Iroh peer and exchange at least
   1 MiB of framed payloads.
2. Android physical device can do the same.
3. Example app demonstrates start, node id, connect, send, receive, close.
4. CI verifies Rust tests and package integrity.
5. Build docs allow a new contributor to regenerate iOS and Android artifacts.
6. Public docs state supported React Native, Expo, iOS, Android, and Iroh ranges.

## References

- Iroh documentation: https://docs.iroh.computer/
- Iroh repository: https://github.com/n0-computer/iroh
- UniFFI: https://mozilla.github.io/uniffi-rs/latest/
- uniffi-bindgen-react-native: https://www.npmjs.com/package/uniffi-bindgen-react-native
- uniffi-bindgen-react-native repo: https://github.com/jhugman/uniffi-bindgen-react-native
