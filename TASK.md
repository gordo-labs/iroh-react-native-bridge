# TASK — Iroh React Native bridge (experimental)

**Area:** `iroh-react-native-bridge/` (submodule at Music Hub parent root)  
**Git:** Independent repository (root = this folder).  
**Parent:** Music Hub — do not block Sovereign alpha merge.  
**Created:** 2026-06-04

## Objective

Build a **standalone** native module so Tape (React Native / Expo) can open an **Iroh encrypted session** without `@number0/iroh` Node NAPI.

Success = device proof: **iOS + Android** round-trip bytes with desktop Iroh or second mobile peer.

## Why (context)

Music Hub Agent 02 documented blockers: [IROH-MOBILE-BINDINGS.md](../../working/roadmap/future/decentralized-hub-discovery/IROH-MOBILE-BINDINGS.md).

- `@number0/iroh` → Node only  
- `n0-computer/iroh-ffi` → Swift/Kotlin reference, no RN, paused maintenance  
- Alpha shipped **WebRTC** + Supabase bootstrap instead

## Non-goals (this repo)

- Music Hub HTTP tunnel / `session.verify` integration  
- Global content swarm / torrent index  
- Replacing `react-native-webrtc` in production Tape  
- Forking entire `iroh-ffi` Python/JS trees

## Proposed layout

```txt
iroh-react-native-bridge/
  rust/iroh_mobile_bridge/     # minimal UniFFI crate
  bindings/                    # generated Swift/Kotlin (ubrn or manual)
  react-native/                # Turbo Module package @music-hub/iroh-bridge
  example/                     # bare Expo app smoke test
  docs/
  TASK.md
```

## API surface (v0 spike)

Expose only what Sovereign needs later:

| Method | Purpose |
| --- | --- |
| `nodeId()` | Opaque peer id for presence `transportPeerId` |
| `start()` / `stop()` | Endpoint lifecycle |
| `connect(addr)` | Dial ticket / node addr |
| `send(bytes)` / `onMessage(cb)` | Bidi stream for tunnel frames |

ALPN / protocol id: align with `experiments/sovereign-remote-transport/src/protocol-alpn.mjs` when integrating.

## Phases

### P0 — Repo bootstrap (this task)

- [x] Independent `git init` + README + TASK
- [ ] Remote on GitHub `gordo-labs/iroh-react-native-bridge` (or org choice)
- [ ] CI stub: Rust `cargo test` + placeholder RN job

### P1 — Rust + UniFFI smoke (2–3 weeks)

- [ ] `Cargo.toml` depends on `iroh` **0.35.x** (match desktop spike)
- [ ] UniFFI exports: `node_id`, `echo_roundtrip`
- [ ] `cargo test` on macOS + Linux CI

### P2 — Native artifacts (2–3 weeks)

- [ ] iOS `.xcframework` via `ubrn` or `cargo-ndk` + scripts
- [ ] Android `.so` / AAR for arm64 (+ x86_64 sim)
- [ ] Document rebuild on every `iroh` bump

### P3 — React Native module (2 weeks)

- [ ] Turbo Module / Expo module config
- [ ] TypeScript types
- [ ] `example/` app: button → echo test on real device

### P4 — Desktop interoperability (1 week)

- [ ] Connect RN example ↔ `experiments/sovereign-remote-transport` desktop probe
- [ ] Document NAT/STUN vs Iroh relay behavior

### P5 — Music Hub integration (separate PR in parent repo)

- [ ] Optional dep in `mobile` behind feature flag
- [ ] `SovereignRouteManager` transport selector `webrtc | iroh`
- [ ] Security review extension

## Acceptance (experiment done)

1. **Android** physical device: echo ≥ 1 MiB without Node runtime.  
2. **iOS** physical device: same.  
3. README: build instructions for EAS prebuild.  
4. Decision doc: recommend merge / postpone / stay WebRTC-only.

## Risks

| Risk | Mitigation |
| --- | --- |
| iroh version drift | Pin crate; monthly bump job |
| Expo binary size | Measure; optional feature flag |
| n0 FFI policy pause | Own thin crate; no dependency on archived bindings |
| Maintenance bus factor | Document rebuild; minimal API |

## References

- [n0-computer/iroh](https://github.com/n0-computer/iroh)
- [iroh-ffi](https://github.com/n0-computer/iroh-ffi) (patterns only)
- [FFI updates blog](https://www.iroh.computer/blog/ffi-updates)
- [UniFFI](https://mozilla.github.io/uniffi-rs/latest/)
- [uniffi-bindgen-react-native](https://www.npmjs.com/package/uniffi-bindgen-react-native) (evaluate)
- Music Hub [SOVEREIGN-REMOTE-ARCHITECTURE.md](../../working/roadmap/future/decentralized-hub-discovery/SOVEREIGN-REMOTE-ARCHITECTURE.md)

## Owner / tracking

| Field | Value |
| --- | --- |
| Priority | Experimental — after alpha dogfood |
| Blocks | None on `feature/sovereign-remote-alpha` merge |
| Parent issue | Sovereign transport — Iroh mobile bridge |
