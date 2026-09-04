# Releasing

This is the maintainer procedure for publishing
`@gordo-labs/react-native-iroh`. The package contains generated native binaries;
a green source CI run is necessary but not sufficient for release.

## Required State

- Work from reviewed `main` with a clean worktree.
- Confirm the GitHub repository is publicly cloneable.
- Confirm npm trusted publishing or a least-privilege automation token is
  configured for the `gordo-labs` scope.
- Use Node.js 22+, rustup stable, Xcode, CocoaPods, Android SDK/NDK and
  `cargo-ndk` as described in [BUILDING.md](./BUILDING.md).
- Update `CHANGELOG.md`, `react-native/package.json` and
  `rust/iroh_mobile_bridge/Cargo.toml` to the same version.

The package is not self-referential: `react-native` is a peer supplied by the
host application, `@ubjs/core` is the only npm runtime dependency, and
`uniffi-bindgen-react-native` is a build-time dependency used by the UBRN
scripts. A `file:`, `workspace:` or `link:` specifier must never be present in
the package metadata. `@gordo-labs/react-native-iroh@0.2.0` is already on the
public registry
(https://www.npmjs.com/package/@gordo-labs/react-native-iroh). `npm view
@gordo-labs/react-native-iroh version` should return the latest published
version. Validate the release tarball locally before publishing a new version.

The package engine is `node >=22`, so Node 26 satisfies the declared range.
Node 22 remains the reproducible maintainer toolchain because it is pinned by
`.nvmrc` and used by CI for native builds.

## Build And Verify

```bash
cd rust/iroh_mobile_bridge
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test

cd ../../react-native
npm ci
npm run ubrn:ios
npm run ubrn:android
npm run verify:release
```

`verify:release` checks the JavaScript API, generic package scope, npm/Cargo
version parity, both iOS slices and all four Android ABIs before performing the
npm dry run. Missing or stale native output must fail the release.

Create the real tarball and retain its exact filename for testing:

```bash
npm pack
shasum -a 256 gordo-labs-react-native-iroh-*.tgz
```

Install that tarball—not the repository directory—in clean iOS and Android test
apps. On physical devices verify:

1. Native module installation and `bridgeVersion()`.
2. Endpoint start/stop and local node id.
3. Direct and relay-assisted dial to a known peer.
4. Two independent streams on one session.
5. At least 1 MiB framed transfer in both directions.
6. Remote close/error notification and reconnect.

## Publish And Tag

The repository includes `.github/workflows/publish.yml`, which builds both
native platforms and publishes from `main` through npm Trusted Publishing.
Configure one trusted publisher on the npm package settings with:

| npm field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Organization or user | `gordo-labs` |
| Repository | `iroh-react-native-bridge` |
| Workflow filename | `publish.yml` |
| Environment | empty |
| Allowed action | `npm publish` |

The workflow has `id-token: write`, uses a GitHub-hosted macOS runner, rebuilds
iOS and Android artifacts, runs `npm run verify:release`, and then publishes
without an npm token. Start it manually from the GitHub Actions tab after the
Trusted Publisher configuration is saved.

For a manual local dry run, use:

```bash
npm publish --dry-run --access public --provenance=false
```

Do not use a local token-based publish for the release when Trusted Publishing
is enabled. The GitHub workflow generates provenance automatically through
OIDC.

Create the matching GitHub release with the changelog entry, supported platform
matrix, tarball SHA-256 and physical-device results. Verify anonymously that
the npm package and GitHub source are readable before announcing the release.

`publishConfig.provenance` is deliberately enabled. npm can only create that
attestation from a supported CI provider (for example, GitHub Actions with
trusted publishing); a local shell has no provenance provider and reports
`Automatic provenance generation not supported for provider: null`. That is a
publishing-environment error, not a package or tarball error.

For a local dry run, or an explicitly non-attested one-off publication, use the
opt-out flag explicitly:

```bash
npm publish --dry-run --access public --provenance=false
# only if the release policy accepts no provenance attestation:
npm publish --access public --provenance=false
```

Do not change `publishConfig.provenance` to `false` just to make local npm
publishing succeed; that would silently remove the release integrity signal.

## Abort Conditions

Do not publish when any of these are true:

- npm and Cargo versions differ.
- A native artifact was not regenerated after an exported Rust API change.
- The packed tarball was not installed in both platform test apps.
- Source CI is red or the worktree contains unrelated changes.
- The npm identity, organization scope or provenance configuration is unclear.
