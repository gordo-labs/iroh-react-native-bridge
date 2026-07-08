# music-hub-iroh-bridge

React Native TurboModule package for a minimal Iroh mobile bridge.

This package is alpha. It is built for native React Native apps and Expo dev
clients. It will not work in Expo Go because Expo Go cannot load custom native
modules.

Native bindings are generated with
[`uniffi-bindgen-react-native`](https://github.com/jhugman/uniffi-bindgen-react-native).

## Install

```bash
npm install music-hub-iroh-bridge
```

iOS:

```bash
npx pod-install ios
```

Then rebuild the native app.

## Usage

```ts
import { getIrohBridge } from 'music-hub-iroh-bridge';

const bridge = getIrohBridge();

await bridge.start();
console.log(await bridge.nodeId());

const connection = await bridge.connect(remoteNodeId, addressHint);
const unsubscribe = connection.onMessage((bytes) => {
  console.log('received bytes', bytes.byteLength);
});

await connection.send(new Uint8Array([1, 2, 3]));

unsubscribe();
await connection.close();
await bridge.stop();
```

## API

```ts
type IrohBridgeConnection = {
  send(data: Uint8Array | number[]): Promise<void>;
  onMessage(handler: (data: Uint8Array) => void): () => void;
  close(): Promise<void>;
};

type IrohBridge = {
  bridgeVersion(): string | Promise<string>;
  nodeId(): string | Promise<string>;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean | Promise<boolean>;
  connect(nodeId: string, relayUrl?: string | null): Promise<IrohBridgeConnection>;
};
```

`connect(nodeId, relayUrl)` keeps the old parameter name for compatibility, but
the second argument is best understood as an address hint. The current Rust layer
rejects display-only values that do not include usable address information.

## Native Module Names

The package resolves both native module names used during the alpha:

- `IrohBridge`
- `MusicHubIrohBridge`

If neither native module is installed, `getIrohBridge()` returns an unavailable
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

`Iroh Rust runtime is not linked into this build yet`

The app fell back to a legacy compatibility shell instead of loading the real
generated runtime.

`Iroh addressing hint is required`

The app tried to dial with only a node id or with a display-only relay value.
Provide direct or relay addressing information from the remote peer.

## Development

```bash
npm pack --dry-run
npm run ubrn:ios
npm run ubrn:android
```

The root repository contains full docs:

- `docs/STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/BUILDING.md`
- `docs/UPSTREAM.md`
- `docs/TROUBLESHOOTING.md`

## License

MIT.
