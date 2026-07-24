# iroh-react-native-bridge - Working Index

Standalone React Native native-module repository. Public docs describe a
generic Iroh transport package for any React Native app.

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

## Git

- Remote: https://github.com/gordo-labs/iroh-react-native-bridge (public)
- Default / release branch: `main` (PR #1 merged 2026-07-23)
- Package line ready to publish: `@gordo-labs/react-native-iroh@0.2.0` (npm pending)

```bash
git status --short --branch
git fetch origin
git switch main
```
