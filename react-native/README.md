# `@gordo-labs/react-native-iroh`

Generic React Native TurboModule for **Iroh endpoints** and **length-prefixed
byte streams** on iOS and Android.

This package is **alpha** (`0.2.0`). It targets modern React Native with the
**New Architecture** enabled. It will **not** work in Expo Go (custom native
modules cannot load there).

Native bindings are generated with
[`uniffi-bindgen-react-native`](https://github.com/jhugman/uniffi-bindgen-react-native)
and use `@ubjs/core` at runtime.

---

## Install

```bash
npm install @gordo-labs/react-native-iroh
```

The first npm registry publish is still pending. Until it lands, link a local
checkout — see [Building → Local App Integration](../docs/BUILDING.md#local-app-integration).

iOS:

```bash
npx pod-install ios
```

Then **rebuild** the native app (JS-only reload is not enough).

---

## What this package is (and is not)

| This package owns | Your app owns |
| --- | --- |
| Iroh endpoint lifecycle (`start` / `stop`) | Pairing, auth, identity trust |
| Local node id (z-base-32) | Discovering the remote peer’s node id + addresses |
| Dialing with caller-provided **ALPN** + **address hint** | Retry / fallback policy |
| Length-prefixed framed byte streams over QUIC | Application protocol (JSON-RPC, HTTP tunnel, media, …) |
| Native TurboModule wiring (iOS + Android) | UI and product branding |

It is **not** a full Iroh SDK. There is **no** incoming “listen as a server”
API for mobile yet — the phone is an **outbound dialer**.

### Mental model

```txt
getIrohBridge()
      │
      ▼
 IrohBridge          ← one process-wide native endpoint
      │
      ├── start({ alpns })
      ├── nodeId()
      │
      ├── connect(...)           → one framed stream (QUIC bi-stream)
      │
      └── openSession(...)       → logical owner of several streams
               │
               └── openStream()  → another independent framed stream
                                   (same remote + ALPN reuses one QUIC session)
```

Important vocabulary:

| Term | Meaning here |
| --- | --- |
| **Endpoint** | Local Iroh node created by `start()`. Lives until `stop()`. |
| **Node id** | Public endpoint identity as **z-base-32** (`nodeId()`). |
| **ALPN** | Application-Layer Protocol Negotiation string. Both peers must agree (e.g. `my-app/1`). Advertised at `start()`, selected again on dial. |
| **Address hint** | How to *reach* the remote: direct socket, relay URL, or JSON ticket. **Required** for dialing. A bare node id is not enough. |
| **QUIC session** | One native transport connection to `(remoteNodeId, alpn)`. Cached and reused (up to 32 warm sessions). |
| **Stream / connection** | One bidirectional framed byte pipe returned by `connect()` or `session.openStream()`. Closing one stream does **not** close siblings. |
| **Logical session** | JS helper from `openSession()` that tracks streams you opened together so you can close them as a group. It does **not** own the native QUIC handle by itself. |

---

## Initialization

```ts
import { getIrohBridge } from '@gordo-labs/react-native-iroh';

const bridge = getIrohBridge();

// Always succeeds as an object. If native linking failed, start()/connect() reject.
await bridge.start({
  alpns: ['my-app/1', 'my-app/control/1'],
});

const localId = await bridge.nodeId(); // z-base-32
console.log('local node', localId, 'running?', await bridge.isRunning());
```

### Rules

1. Call **`start()` before** `connect()` / `openSession()`.
2. Pass every ALPN your app might dial (or accept later when server mode exists).
3. If `alpns` is omitted, the endpoint uses the default **`iroh-rn/1`**.
4. Calling `start()` again while already running is a **no-op** (ALPNs are not
   changed). To restart with different ALPNs: `await bridge.stop()` then
   `start(...)` again.
5. Relays use Iroh’s **default relay set** (`RelayMode::Default`) so off-LAN
   dials can work when the hint includes a relay URL.
6. On teardown / logout: close streams/sessions, then `await bridge.stop()`.

### Native module name

The TurboModule is named **`IrohBridge`**. If it is missing from the binary,
`getIrohBridge()` still returns a stub; `start` / `connect` / `openSession`
reject with a diagnostic error (see [Expected Errors](#expected-errors)).

---

## Method reference

### `getIrohBridge(): IrohBridge`

Returns the process singleton wrapper. Safe to call multiple times.

---

### Bridge methods

#### `bridgeVersion(): string | Promise<string>`

Native crate / package version string (e.g. `0.2.0`). Useful in support logs.
If the native runtime failed to load, may return `unavailable: …`.

#### `start(options?: { alpns?: string[] }): Promise<void>`

Creates the local Iroh endpoint.

| Field | Required | Notes |
| --- | --- | --- |
| `alpns` | no | Non-empty strings. Default: `['iroh-rn/1']`. |

Rejects if ALPNs are invalid. Does nothing if already started.

#### `stop(): Promise<void>`

Closes all open streams, clears the warm session cache, and shuts down the
endpoint. Safe to call when not running.

#### `isRunning(): boolean | Promise<boolean>`

`true` after a successful `start()` until `stop()`.

#### `nodeId(): string | Promise<string>`

Local endpoint id as **z-base-32**. Empty string if not started.

#### `connect(options): Promise<IrohBridgeConnection>`

Dials (or reuses) the peer QUIC session for `(nodeId, alpn)` and opens **one**
new bidirectional framed stream.

| Field | Required | Notes |
| --- | --- | --- |
| `nodeId` | **yes** | Remote id (z-base-32 preferred; hex/base32hex also accepted). May be prefixed with `iroh://` or `iroh+relay://` (prefix stripped). |
| `alpn` | **yes** | Must match a protocol the remote speaks. Should also have been listed in `start({ alpns })` on this device. |
| `addressHint` | **yes for dial** | Usable addressing (see [Address hints](#address-hints)). Empty / display-only values are rejected. |
| `timeoutMs` | no | Positive number. Default **4500**. Applies to dial and opening the bi-stream. |

Repeated `connect()` calls to the same `(nodeId, alpn)` **reuse** one warm QUIC
session and open a **new** stream each time (no head-of-line blocking between
app messages that use different streams).

#### `openSession(options): Promise<IrohBridgeSession>`

Same dial options as `connect()`, but returns a **logical session** helper:

- `openStream()` → same as one `connect()` with those options
- `close()` → closes every stream this helper opened
- Does **not** force-evict the shared native QUIC session (siblings / other
  callers can keep using it until LRU eviction or `bridge.stop()`)

Use this when one feature owns several streams (e.g. control + media) and should
tear them down together.

---

### Stream methods (`IrohBridgeConnection`)

Returned by `connect()` or `session.openStream()`.

#### `send(data: Uint8Array | number[]): Promise<void>`

Sends **one frame**. Payload must be **non-empty** and ≤ **2 MiB**.

- Sends on one stream are **serialized** (ordered).
- If the native send queue is full (16 MiB / 64 frames), JS retries briefly;
  after ~30s it rejects with a backpressure / queue-full error.
- Do not send empty arrays — they are rejected as invalid frames.

#### `onMessage(handler: (data: Uint8Array) => void): () => void`

Subscribe to inbound frames. Returns an **unsubscribe** function.

- Multiple listeners on the same stream each receive every frame.
- Receiving only starts pumping while at least one `onMessage` or `onClose`
  observer is registered.

#### `onClose(handler: () => void): () => void`

Fires once when the stream closes (local `close()`, remote close, or fatal
pump error). If already closed, the handler is scheduled asynchronously.
Returns unsubscribe.

#### `onError(handler: (error: Error) => void): () => void`

Fires on send/receive failures (normalized Rust / JS errors). Returns
unsubscribe. A fatal pump error also triggers `onClose`.

#### `isClosed(): boolean`

Local closed flag after `close()` or observed remote closure.

#### `close(): Promise<void>`

Closes this stream only. Sibling streams stay open.

---

### Session methods (`IrohBridgeSession`)

#### `openStream(): Promise<IrohBridgeConnection>`

Opens another independent framed stream to the same peer/ALPN.

#### `isClosed(): boolean`

Whether `session.close()` has been called.

#### `close(): Promise<void>`

Closes all streams opened through this session object.

---

## Address hints

Dialing **requires** a usable `addressHint`. A node id alone is rejected.

Accepted forms (after optional `iroh+ticket://` / `iroh+ticket:` strip):

| Form | Example | Meaning |
| --- | --- | --- |
| Direct socket | `203.0.113.10:4433` | `TransportAddr::Ip` |
| Prefixed direct | `iroh+direct://203.0.113.10:4433` or `ip:203.0.113.10:4433` | Same |
| Relay URL | `https://relay.example` | `TransportAddr::Relay` |
| Prefixed relay | `relay:https://relay.example` | Same |
| JSON ticket | `{"id":"<z32>","addrs":["https://…","1.2.3.4:4433"]}` | Parsed ticket; `addrs` must contain ≥1 usable entry |

Rejected / useless examples:

- Missing / empty hint
- Display-only strings with no socket or `http(s)` relay
- Bare `iroh+relay://…` without a real relay URL or direct addresses

Your host app must obtain hints from the remote peer (pairing QR, ticket API,
discovery service, etc.). This package does not discover peers by itself.

---

## Framing and limits

On the wire, each `send()` is:

```txt
[4-byte big-endian length][payload bytes]
```

| Limit | Value |
| --- | --- |
| Max frame payload | **2 MiB** |
| Per-stream send queue | **16 MiB** (and 64 frames) |
| Per-stream receive inbox | **16 MiB** (and 256 frames) |
| Warm QUIC sessions | **32** (LRU) |
| Default connect timeout | **4500 ms** |

Empty payloads are invalid. When JS is slow to drain `onMessage`, native
receive pauses and QUIC flow control applies backpressure instead of growing
unbounded memory.

Above this framing, define your own application messages (JSON, protobuf, …).

---

## Generic connection examples

### 1. Single stream (`connect`)

Minimal dial + ping/pong-style exchange:

```ts
import { getIrohBridge } from '@gordo-labs/react-native-iroh';

const ALPN = 'demo-app/1';
const bridge = getIrohBridge();

async function runOnce(remote: {
  nodeId: string;
  addressHint: string;
}) {
  await bridge.start({ alpns: [ALPN] });
  console.log('I am', await bridge.nodeId());

  const stream = await bridge.connect({
    nodeId: remote.nodeId,
    alpn: ALPN,
    addressHint: remote.addressHint,
    timeoutMs: 4500,
  });

  const stopError = stream.onError((error) => {
    console.warn('stream error', error.message);
  });
  const stopClose = stream.onClose(() => {
    console.log('stream closed');
  });
  const stopMessage = stream.onMessage((bytes) => {
    const text = new TextDecoder().decode(bytes);
    console.log('recv', text);
  });

  const ping = new TextEncoder().encode(JSON.stringify({ type: 'ping', t: Date.now() }));
  await stream.send(ping);

  // … later
  stopMessage();
  stopClose();
  stopError();
  await stream.close();
  await bridge.stop();
}
```

### 2. Several streams (`openSession`)

Typical pattern: one control stream + one bulk/data stream on the same peer,
torn down together:

```ts
import { getIrohBridge } from '@gordo-labs/react-native-iroh';

const ALPN = 'demo-app/1';
const bridge = getIrohBridge();

async function connectPeer(remote: { nodeId: string; addressHint: string }) {
  await bridge.start({ alpns: [ALPN] });

  const session = await bridge.openSession({
    nodeId: remote.nodeId,
    alpn: ALPN,
    addressHint: remote.addressHint,
    timeoutMs: 6000,
  });

  const control = await session.openStream();
  const data = await session.openStream();

  control.onError(console.warn);
  data.onError(console.warn);

  control.onMessage((bytes) => {
    // parse control protocol
    console.log('control', bytes.byteLength);
  });
  data.onMessage((bytes) => {
    // parse bulk frames
    console.log('data', bytes.byteLength);
  });

  await control.send(new TextEncoder().encode('{"type":"hello"}'));
  await data.send(Uint8Array.from([0x01, 0x02, 0x03]));

  // Closing the logical session closes both streams.
  // The warm QUIC peer session may remain for other callers until stop()/LRU.
  await session.close();
}

async function shutdown() {
  await bridge.stop();
}
```

### 3. Two peers in one process (concept only)

This package is usually one endpoint per app process. A full two-device demo
needs:

1. Device A: `start` → `nodeId()` + publish its address ticket / relay / direct addrs.
2. Device B: `start` → `connect({ nodeId: A, addressHint: … })`.
3. The remote side must speak the same ALPN and the same length-prefixed framing.

Until mobile **listen/accept** is exposed, the “server” is typically a desktop
or other Iroh node that already accepts that ALPN; the phone dials out.

### 4. Lifecycle sketch for a real app

```ts
// app bootstrap
const bridge = getIrohBridge();
await bridge.start({ alpns: ['my-app/1'] });

// after pairing gives you remote credentials
let session = await bridge.openSession({
  nodeId: paired.nodeId,
  alpn: 'my-app/1',
  addressHint: paired.addressHint,
});

// feature code uses session.openStream() …

// on disconnect / logout
await session.close();
session = null;

// on app teardown
await bridge.stop();
```

---

## TypeScript surface

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

declare function getIrohBridge(): IrohBridge;
```

---

## Expected errors

| Message / tag | Meaning | What to do |
| --- | --- | --- |
| `IrohBridge TurboModule is not installed for ios/android` | Native package not in the binary | Reinstall deps, `pod-install`, rebuild native app |
| `Iroh JSI installer is not available` | TurboModule present but JSI installer missing / version skew | Rebuild; align JS package with native artifacts |
| `Iroh addressing hint is required` / `did not include usable addresses` | Bad or missing `addressHint` | Pass relay URL, direct socket, or JSON ticket from the peer |
| `IrohBridgeError.NotStarted` | Dialed before `start()` | Call `start()` first |
| `IrohBridgeError.InvalidNodeId` | Unparseable `nodeId` | Use z-base-32 (or accepted hex form) from the peer |
| `IrohBridgeError.InvalidFrame` | Empty or >2 MiB payload | Fix app framing |
| `Iroh connect timed out` | Dial / bi-stream open exceeded `timeoutMs` | Check network, hint, relays; raise timeout carefully |
| `Iroh send queue is full` | Receiver too slow / backpressure | Slow sends, drain `onMessage`, or close and redial |
| `Iroh stream is closed` / `Iroh session is closed` | Used after local/remote close | Open a new stream/session |

Rust errors are normalized to `Error` messages like `IrohBridgeError.<Tag>: …`.

---

## Development (this repo)

```bash
npm ci
npm run test:source
npm run ubrn:ios
npm run ubrn:android
npm run verify:release
```

`verify:release` requires generated native artifact sets and matching npm/Cargo
versions. Source-only checkouts should use `test:source`.

Broader docs in the parent repository:

- [`docs/STATUS.md`](../docs/STATUS.md)
- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
- [`docs/BUILDING.md`](../docs/BUILDING.md)
- [`docs/RELEASING.md`](../docs/RELEASING.md)
- [`docs/UPSTREAM.md`](../docs/UPSTREAM.md)
- [`docs/TROUBLESHOOTING.md`](../docs/TROUBLESHOOTING.md)

## License

MIT.
