# Upstream Dependencies

This repo is intentionally thin. It should not become a long-lived fork of its
generator or of Iroh itself.

## uniffi-bindgen-react-native

Repository:

https://github.com/jhugman/uniffi-bindgen-react-native

Role in this project:

- Generates TypeScript bindings from Rust/UniFFI exports.
- Generates React Native TurboModule scaffolding.
- Provides the JSI runtime installation path used by this package.
- Provides `ubrn`, the CLI used by `npm run ubrn:ios` and
  `npm run ubrn:android`.
- Provides `@ubjs/core`, which newer generated JavaScript imports as its
  runtime.

Current package line used here:

- `uniffi-bindgen-react-native`: `0.31.0-3`
- `@ubjs/core`: `0.31.0-3`

When to upstream a fix:

- Generated TypeScript imports the wrong runtime.
- Generated C++/Objective-C++ has invalid symbols.
- TurboModule registration or JSI installation behavior is generally wrong.
- The same issue can be reproduced with a minimal non-Iroh Rust crate.

When to keep the fix here:

- Iroh-specific endpoint lifecycle.
- Android JNI context setup for Iroh DNS/network behavior.
- Address-hint validation.
- Host-app protocol choices such as ALPN values and message semantics.
- Package docs, examples, or app-level diagnostics.

## Iroh

Repository:

https://github.com/n0-computer/iroh

Role in this project:

- Provides the Rust peer-to-peer networking stack.
- Owns endpoint, relay, discovery, ALPN, and QUIC behavior.

When a connection failure appears to be Iroh-level rather than bridge-level,
reduce it to a Rust-only reproduction before reporting upstream.

## React Native

This package depends on modern React Native TurboModule and JSI behavior.
Version-specific native-linking failures should be reproduced in a minimal app
before filing upstream issues.

## Maintenance Rule

Prefer the smallest local workaround that keeps Music Hub moving, then open an
upstream issue or PR if the fix belongs to the generator/runtime. Do not let this
repo quietly accumulate permanent generated-code patches without documentation.
