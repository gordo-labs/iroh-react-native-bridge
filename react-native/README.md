# @gordo-labs/react-native-iroh

Generic React Native TurboModule package for Iroh endpoints and framed byte
streams.

This package is alpha. It targets modern React Native apps with the New
Architecture enabled. It will not work in Expo Go because Expo Go cannot load
custom native modules.

Native bindings are generated with
[`uniffi-bindgen-react-native`](https://github.com/jhugman/uniffi-bindgen-react-native)
and use `@ubjs/core` at runtime.

## Install

After the first public npm release:

```bash
npm install @gordo-labs/react-native-iroh
```

Until then, use the repository checkout as a local `file:` dependency. The
package is an alpha release candidate and is not currently listed in the public
npm registry.

iOS:

```bash
npx pod-install ios
```

Then rebuild the native app.

## Scope

This package owns only:

- Iroh endpoint lifecycle
- local node id
- dialing with caller-provided ALPN and address hints
- length-prefixed byte streams
- native package wiring for Android and iOS
- low-level diagnostics

Host apps own their own protocol, identity, authentication, routing policy,
HTTP tunneling, media handling, and UI.

## Usage

```ts
import { getIrohBridge } from '@gordo-labs/react-native-iroh';

const bridge = getIrohBridge();

await bridge.start({ alpns: ['my-app/1'] });
console.log(await bridge.nodeId());

const session = await bridge.openSession({
  nodeId: remoteNodeId,
  alpn: 'my-app/1',
  addressHint,
  timeoutMs: 4500,
});
const control = await session.openStream();
const media = await session.openStream();

const unsubscribe = control.onMessage((bytes) => {
  console.log('received bytes', bytes.byteLength);
});

await control.send(new Uint8Array([1, 2, 3]));
await media.send(new Uint8Array([4, 5, 6]));

unsubscribe();
await session.close();
await bridge.stop();
```

## API

```ts
type IrohBridgeConnection = {
  send(data: Uint8Array | number[]): Promise<void>;
  onMessage(handler: (data: Uint8Array) => void): () => void;
  onClose(handler: () => void): () => void;
  onError(handler: (error: Error) => void): () => void;
  isClosed(): boolean;
  close(): Promise<void>;
};

type IrohBridgeSession = {
  openStream(): Promise<IrohBridgeConnection>;
  isClosed(): boolean;
  close(): Promise<void>;
};

type IrohBridge = {
  bridgeVersion(): string | Promise<string>;
  nodeId(): string | Promise<string>;
  start(options?: { alpns?: string[] }): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean | Promise<boolean>;
  connect(options: {
    nodeId: string;
    alpn: string;
    addressHint?: string | null;
    timeoutMs?: number;
  }): Promise<IrohBridgeConnection>;
  openSession(options: {
    nodeId: string;
    alpn: string;
    addressHint?: string | null;
    timeoutMs?: number;
  }): Promise<IrohBridgeSession>;
};
```

`connect()` remains the compact one-stream API. Every call opens an independent
QUIC stream and reuses a warm native session for the same node id + ALPN.
`openSession()` is an ownership helper for applications that want to manage
several streams together. Closing one stream never closes its siblings.
Closing the logical session closes all streams it owns; the shared native QUIC
session may remain warm for other callers until LRU eviction or `bridge.stop()`.

Each frame is limited to 2 MiB. Sends are serialized per stream and wait for a
byte-bounded 16 MiB native queue. The receive inbox is also limited to 16 MiB;
when JavaScript is slow, QUIC flow control applies backpressure instead of
allowing unbounded native memory growth.

`addressHint` must contain usable Iroh addressing information. Display-only
values that do not include a relay URL, direct socket address, or ticket-like
address data are rejected before dialing.

## Native Module Name

The native TurboModule name is `IrohBridge`.

If the native module is not installed, `getIrohBridge()` returns an unavailable
bridge object. Calling `start()` or `connect()` will reject with a diagnostic
error.

## Expected Errors

`IrohBridge TurboModule is not installed for ios/android`

The native package was not linked into the app binary. Reinstall dependencies,
install pods on iOS, and rebuild the native app.

`Iroh JSI installer is not available`

The TurboModule exists but the generated JSI installer is not reachable. Rebuild
the native app and verify the package version in the JS bundle matches the
native binary.

`Iroh addressing hint is required`

The app tried to dial with only a node id or with a display-only value. Provide
direct, relay, or ticket-like addressing information from the remote peer.

## Development

```bash
npm ci
npm run test:source
npm run ubrn:ios
npm run ubrn:android
npm run verify:release
```

`verify:release` requires both generated native artifact sets and fails if the
npm and Cargo versions differ. A source-only checkout should use `test:source`;
`npm pack --dry-run` alone is not a sufficient native release check.

The repository contains full docs:

- `docs/STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/BUILDING.md`
- `docs/RELEASING.md`
- `docs/UPSTREAM.md`
- `docs/TROUBLESHOOTING.md`

## License

MIT.
