# AGENTS.md — iroh-react-native-bridge

**Git:** independent repo, mounted as a **submodule** at the Music Hub parent root (`iroh-react-native-bridge/`).

## Every session

1. [PROJECT.json](./PROJECT.json) + [TASK.md](./TASK.md)
2. Parent context (on demand): [../DOCS-MAP.md](../DOCS-MAP.md), [../working/roadmap/future/decentralized-hub-discovery/IROH-MOBILE-BINDINGS.md](../working/roadmap/future/decentralized-hub-discovery/IROH-MOBILE-BINDINGS.md)

## Scope

Pre-implementation experiment only. **Not** in Sovereign Remote alpha (mobile uses WebRTC). Do not change `desktop/` or `mobile/` from here unless integrating a published bridge.

## Clone (fresh parent checkout)

```bash
git clone --recurse-submodules https://github.com/gordo-labs/music-hub-parent.git
# or after clone:
git submodule update --init iroh-react-native-bridge
```
