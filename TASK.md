# TASK - Iroh React Native Bridge

## Objective

Provide a small, reusable React Native package that lets iOS and Android apps
open Iroh encrypted sessions without a Node runtime.

The bridge is intentionally narrow: endpoint lifecycle, node id, outbound
connection, framed binary send/receive, and clear native-linking errors. It is
product-agnostic — host apps own pairing, auth, discovery, and higher-level
protocols.

## Current Status

Beta. Public source is on `main`.
`@gordo-labs/react-native-iroh@0.2.0` is published on npm (2026-08-06).

Completed:

- Independent public GitHub repo (`gordo-labs/iroh-react-native-bridge`).
- Rust crate using `iroh` 1.x.
- UniFFI/JSI generated runtime.
- React Native TurboModule package.
- Android `.so` artifacts (4 ABIs) and iOS `.xcframework`.
- Package line `@gordo-labs/react-native-iroh@0.2.0` on `main`.
- Local checkout validation path documented for bridge contributors (`file:`
  only in [docs/BUILDING.md](./docs/BUILDING.md); consumers use npm).
- `jhugman/uniffi-bindgen-react-native` documented as the upstream generator
  and preferred target for generator/runtime fixes.
- `RelayMode::Default` so mobile can dial via n0 relays off-LAN (0.1.2).
- Build helpers that prefer rustup + auto-detect Homebrew NDK.
- Real-device Android QA: dial + framed stream over n0 relays (2026-07-21).
- Reused QUIC peer sessions with independent bidirectional streams (`0.2.0`).
- Bounded native queues, receive backpressure, deterministic stream close, and
  multicast JavaScript listeners.
- Public-source CI gates and release artifact validation.
- [PR #1](https://github.com/gordo-labs/iroh-react-native-bridge/pull/1) merged
  to `main` with green CI (2026-07-23).

Remaining operator gates after the first public npm release (`0.2.0`, 2026-08-06):

- npm trusted publishing / org token for the `gordo-labs` scope (later releases).
- Physical-device release checklist against the packed tarball.
- Signed tag `v0.2.0` + GitHub release checksums.

Still required before stable 1.0:

- Public example app.
- Broader real-device matrix.
- Native regeneration CI and broader package compatibility coverage.
- API freeze and semver policy.

## API Surface

| Method | Purpose |
| --- | --- |
| `bridgeVersion()` | Runtime version diagnostics |
| `nodeId()` | Local Iroh endpoint id after start |
| `start()` / `stop()` | Endpoint lifecycle |
| `isRunning()` | Native endpoint state |
| `connect(options)` | Open one framed stream on a reused peer session |
| `openSession(options)` | Own and close several independent streams together |
| `connection.send(bytes)` | Send one framed binary message |
| `connection.onMessage(cb)` | Receive framed binary messages |
| `connection.close()` | Close the native connection |

## Non-goals

- A wrapper around every Iroh protocol or experimental API.
- App-level authentication or pairing.
- HTTP / RPC tunneling (belongs in the host app or a separate package).
- Content storage, blobs, sync, or provider APIs.
- A hidden fallback that pretends Iroh is connected when native linking failed.
- Product-specific branding or integration docs for a single consumer app.

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
