# Status

`iroh-react-native-bridge` is alpha software.

It is good enough for controlled app integration and device testing. It is not
yet a stable general-purpose React Native Iroh SDK.

## Current Package

| Field | Value |
| --- | --- |
| npm package | `@gordo-labs/react-native-iroh` |
| current line | `0.1.x` |
| React Native surface | TurboModule + JSI installed runtime |
| Rust crate | `rust/iroh_mobile_bridge` |
| Iroh crate | `iroh` 1.x |
| License | MIT |

## Supported Today

| Capability | Status |
| --- | --- |
| Start/stop local Iroh endpoint | Implemented |
| Read local node id | Implemented |
| Dial remote endpoint by node id plus address hint | Implemented |
| Send/receive framed binary messages | Implemented |
| Android JNI context initialization | Implemented |
| iOS xcframework packaging | Implemented |
| npm package packaging | Implemented |
| Incoming mobile peer server mode | Not exposed |
| High-level HTTP tunnel | Host app responsibility |
| App authentication/pairing | Host app responsibility |
| Public example app | Not yet |
| Off-LAN dial via n0 default relays | Implemented (`RelayMode::Default`, 0.1.2) |
| Music Hub Android device QA (connect + stream) | Verified 2026-07-21 against hub on iroh 1.x prod relays |

## Platform Notes

### iOS

- Uses `IrohBridge.podspec`.
- Links `ReactNativeIrohBridgeFramework.xcframework`.
- The generated TurboModule name is `IrohBridge`.
- Requires a native rebuild when the pod, xcframework, or generated native code
  changes.
- The bundled xcframework currently targets iOS arm64 and arm64 simulator.

### Android

- Uses React Native autolinking through `react-native.config.js`.
- The current package registers `IrohBridgePackage`.
- The JS resolver expects the `IrohBridge` TurboModule.
- Android initializes Iroh's JNI context before endpoint startup.

## Runtime Truths

The bridge must not pretend to be connected if the native runtime is missing.
Expected unavailable states include:

- The native package was not linked into the app binary.
- The JSI installer cannot be found.
- Rust endpoint startup fails.
- The remote peer advertised no usable addressing hint.

Host apps should show those states clearly and route through their own fallback
transport when available.

## Known Risks

- React Native New Architecture and TurboModule behavior varies across RN/Expo
  versions.
- NAT/relay behavior needs more real-world reporting.
- Native binary artifact regeneration is still manual.
- The package is large because it includes iOS and Android native binaries.
- The API may change before 1.0.
