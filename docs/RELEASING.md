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

Inspect `npm whoami` and `npm publish --dry-run` before changing the registry.
Then publish exactly the tested worktree:

```bash
npm publish --access public --provenance
PACKAGE_VERSION="$(node -p "require('./package.json').version")"
git tag -s "v${PACKAGE_VERSION}" -m "Release ${PACKAGE_VERSION}"
git push origin --tags
```

Create the matching GitHub release with the changelog entry, supported platform
matrix, tarball SHA-256 and physical-device results. Verify anonymously that
the npm package and GitHub source are readable before announcing the release.

## Abort Conditions

Do not publish when any of these are true:

- npm and Cargo versions differ.
- A native artifact was not regenerated after an exported Rust API change.
- The packed tarball was not installed in both platform test apps.
- Source CI is red or the worktree contains unrelated changes.
- The npm identity, organization scope or provenance configuration is unclear.
