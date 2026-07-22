# AGENTS.md - iroh-react-native-bridge

Independent Git repository, mounted as a submodule at the Music Hub parent root
under `iroh-react-native-bridge/`.

## Every Session

1. Check `git status --short --branch`.
2. Read [PROJECT.json](./PROJECT.json), [WORKING-INDEX.md](./WORKING-INDEX.md),
   and [docs/STATUS.md](./docs/STATUS.md).
3. Respect unrelated local changes. Native generated artifacts are large and may
   be intentionally dirty during device testing.

## Scope

This repo owns the reusable React Native Iroh bridge:

- Rust crate in `rust/iroh_mobile_bridge/`.
- npm package in `react-native/`.
- Public open-source docs, CI, issue templates, and contribution process.

Music Hub app integration lives in the parent `mobile/` and `desktop/` repos.
Do not edit those repos from here unless the task explicitly asks for app
integration.

## Status

Alpha. The bridge is used for controlled Music Hub Iroh testing and is being
prepared for its first public npm release, but the API and packaging are not
stable. Keep docs honest about current limits and release availability.

## Clone From Parent Checkout

```bash
git clone --recurse-submodules https://github.com/gordo-labs/music-hub-parent.git
# or after clone:
git submodule update --init iroh-react-native-bridge
```
