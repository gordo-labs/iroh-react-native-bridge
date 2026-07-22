# iroh-react-native-bridge - Working Index

Standalone React Native native-module repo. It is mounted as a submodule inside
Music Hub, but it is intended to be usable by external React Native apps too.

## Start Here

| Doc | Purpose |
| --- | --- |
| [README.md](./README.md) | Public overview |
| [docs/STATUS.md](./docs/STATUS.md) | Current support matrix and known limits |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Native and JS architecture |
| [docs/BUILDING.md](./docs/BUILDING.md) | Build and packaging workflow |
| [docs/RELEASING.md](./docs/RELEASING.md) | Maintainer release and npm publication gate |
| [docs/UPSTREAM.md](./docs/UPSTREAM.md) | Upstream projects, especially `uniffi-bindgen-react-native` |
| [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | Common failures and fixes |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Work planned before stable release |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to open issues and PRs |

## Package Surfaces

| Path | Purpose |
| --- | --- |
| [react-native/](./react-native/) | npm package `@gordo-labs/react-native-iroh` |
| [rust/iroh_mobile_bridge/](./rust/iroh_mobile_bridge/) | Rust crate and Iroh endpoint implementation |
| [.github/](./.github/) | CI, issue templates, PR template |

## Music Hub Parent Context

These links work when this repo is checked out inside the Music Hub parent
workspace.

| Doc | Purpose |
| --- | --- |
| [../DOCS-MAP.md](../DOCS-MAP.md) | Hub-wide navigation |
| [../working/roadmap/future/decentralized-hub-discovery/IROH-MOBILE-BINDINGS.md](../working/roadmap/future/decentralized-hub-discovery/IROH-MOBILE-BINDINGS.md) | Original mobile Iroh research |
| [../working/roadmap/future/decentralized-hub-discovery/SOVEREIGN-REMOTE-ARCHITECTURE.md](../working/roadmap/future/decentralized-hub-discovery/SOVEREIGN-REMOTE-ARCHITECTURE.md) | Music Hub Sovereign Remote architecture |
| [../working/roadmap/future/decentralized-hub-discovery/IROH-RN-IMPLEMENTATION-REVIEW.md](../working/roadmap/future/decentralized-hub-discovery/IROH-RN-IMPLEMENTATION-REVIEW.md) | Integration review and lessons learned |

## Git

- Remote: https://github.com/gordo-labs/iroh-react-native-bridge
- Main development branch during alpha: `epic/react-native-package`
- Production/open-source release branch target: `main`

```bash
git status --short --branch
git fetch origin
```
