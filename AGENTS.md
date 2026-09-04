# AGENTS.md - iroh-react-native-bridge

Standalone Git repository for a **generic** React Native Iroh bridge. Public
docs, package naming, examples, and CI must stay product-agnostic. Host-app
integration (pairing, auth, tunnels, UI) belongs in consumer applications, not
here.

## Every Session

1. Check `git status --short --branch`.
2. Read [PROJECT.json](./PROJECT.json), [WORKING-INDEX.md](./WORKING-INDEX.md),
   and [docs/STATUS.md](./docs/STATUS.md).
3. Respect unrelated local changes. Native generated artifacts are large and may
   be intentionally dirty during device testing.

## Scope

This repo owns only:

- Rust crate in `rust/iroh_mobile_bridge/`.
- npm package in `react-native/` (`@gordo-labs/react-native-iroh`).
- Public open-source docs, CI, issue templates, and contribution process.

Do not add product-specific protocols, branding, or integration guides for a
single consumer app. Keep the JavaScript/Rust API and docs reusable by any
React Native team.

## Status

Alpha. Public source is on `main` (`0.2.0`).
`@gordo-labs/react-native-iroh@0.2.0` is published on npm
(https://www.npmjs.com/package/@gordo-labs/react-native-iroh). API and packaging
are not stable before 1.0 — keep docs honest about current limits and registry
status.

## Clone

```bash
git clone https://github.com/gordo-labs/iroh-react-native-bridge.git
cd iroh-react-native-bridge
```
