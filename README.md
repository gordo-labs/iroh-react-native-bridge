# iroh-react-native-bridge (experiment)

Independent experiment to expose a **minimal Iroh peer API** to **React Native** (Expo prebuild / Turbo Module).

**Not** part of Music Hub alpha. Parent app uses **WebRTC + HTTPS bootstrap** until this repo proves device connectivity.

## Status

`planning` — see [TASK.md](./TASK.md).

## Relationship to Music Hub

| Repo | Role |
| --- | --- |
| `music-streaming-hub` | Sovereign alpha (WebRTC, Supabase presence) |
| `iroh-react-native-bridge` (this) | Optional future transport for Tape mobile |

Integration target (later): `mobile` depends on published package or monorepo submodule.

## Docs

- [WORKING-INDEX.md](./WORKING-INDEX.md) — navigation (this repo + parent links)
- [TASK.md](./TASK.md) — scope, phases, acceptance
- [Music Hub Iroh strategy](../working/roadmap/future/decentralized-hub-discovery/IROH-MOBILE-BINDINGS.md)
- Umbrella checkout: [music-hub-parent](https://github.com/gordo-labs/music-hub-parent) — this directory is `iroh-react-native-bridge/` at the hub root (submodule).

## License

[MIT](./LICENSE) — open source. Rust dependencies follow their respective licenses (`iroh`, n0, etc.) when linked in P1.
