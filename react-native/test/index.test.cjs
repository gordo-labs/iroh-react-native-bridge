'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

function loadBridgeRuntime() {
  const nativePath = require.resolve('../src/NativeIrohBridge.js');
  const generatedPath = require.resolve('../src/generated/iroh_mobile_bridge.js');
  const indexPath = require.resolve('../src/index.js');
  let nextId = 1;
  const sent = [];
  const closed = [];
  const connectCalls = [];
  const connectTargetCalls = [];
  const forwarderCalls = [];
  const stoppedForwarders = [];
  const inboxes = new Map();
  const openStream = () => {
    const id = `stream-${nextId++}`;
    inboxes.set(id, []);
    return id;
  };
  const runtime = {
    bridgeVersion: () => '0.2.0',
    nodeId: () => 'test-node',
    start: () => {},
    stop: () => {},
    isRunning: () => true,
    connect: (...args) => {
      connectCalls.push(args);
      return openStream();
    },
    connectTarget: (...args) => {
      connectTargetCalls.push(args);
      return openStream();
    },
    send: (id, payload) => sent.push([id, new Uint8Array(payload)]),
    isStreamOpen: (id) => inboxes.has(id) && !closed.includes(id),
    nextMessage: (id) => inboxes.get(id)?.shift(),
    close: (id) => closed.push(id),
    startTcpForwarder: (opts) => {
      forwarderCalls.push(opts);
      return { id: 'tcp-forwarder-1', port: 41234 };
    },
    tcpForwarderStats: () => ({
      activeConnections: 1,
      totalConnections: 3n,
      failedStreams: 0n,
      bytesUp: 120n,
      bytesDown: 64000n,
      activeDownMs: 500n,
    }),
    stopTcpForwarder: (id) => stoppedForwarders.push(id),
  };

  require.cache[nativePath] = {
    id: nativePath,
    filename: nativePath,
    loaded: true,
    exports: { installRustCrate() {} },
  };
  require.cache[generatedPath] = {
    id: generatedPath,
    filename: generatedPath,
    loaded: true,
    exports: runtime,
  };
  delete require.cache[indexPath];
  const api = require(indexPath);
  return {
    api,
    bridge: api.getIrohBridge(),
    runtime,
    sent,
    closed,
    inboxes,
    connectCalls,
    connectTargetCalls,
    forwarderCalls,
    stoppedForwarders,
  };
}

const options = {
  nodeId: 'peer-node',
  alpn: 'example/1',
  addressHint: '127.0.0.1:4433',
};

test('logical session owns several independent streams', async () => {
  const { bridge, sent, closed } = loadBridgeRuntime();
  const session = await bridge.openSession(options);
  const first = await session.openStream();
  const second = await session.openStream();

  await first.send(Uint8Array.from([1, 2]));
  await second.send(Uint8Array.from([3, 4]));

  assert.equal(sent.length, 2);
  assert.notEqual(sent[0][0], sent[1][0]);
  assert.deepEqual([...sent[0][1]], [1, 2]);
  await session.close();
  assert.equal(session.isClosed(), true);
  assert.deepEqual(closed.sort(), ['stream-1', 'stream-2']);
});

test('multiple listeners receive the same stream frame', async () => {
  const { bridge, inboxes } = loadBridgeRuntime();
  const stream = await bridge.connect(options);
  const receivedA = [];
  const receivedB = [];
  const unsubscribeA = stream.onMessage((bytes) => receivedA.push([...bytes]));
  const unsubscribeB = stream.onMessage((bytes) => receivedB.push([...bytes]));
  inboxes.get('stream-1').push(Uint8Array.from([9]).buffer);

  await new Promise((resolve) => setTimeout(resolve, 25));
  unsubscribeA();
  unsubscribeB();
  await stream.close();

  assert.deepEqual(receivedA, [[9]]);
  assert.deepEqual(receivedB, [[9]]);
});

test('onClose observes native remote closure without a message listener', async () => {
  const { bridge, inboxes } = loadBridgeRuntime();
  const stream = await bridge.connect(options);
  let closeCount = 0;
  stream.onClose(() => { closeCount += 1; });
  inboxes.delete('stream-1');

  await new Promise((resolve) => setTimeout(resolve, 75));

  assert.equal(stream.isClosed(), true);
  assert.equal(closeCount, 1);
});

test('legacy connect contract remains unchanged', async () => {
  const { bridge, connectCalls } = loadBridgeRuntime();
  const stream = await bridge.connect(options);

  assert.deepEqual(connectCalls, [[
    'peer-node',
    'example/1',
    '127.0.0.1:4433',
    undefined,
  ]]);
  await stream.close();
});

test('typed endpoint address is normalized before crossing the native boundary', async () => {
  const { bridge, connectTargetCalls } = loadBridgeRuntime();
  const stream = await bridge.connectTarget({
    target: {
      kind: 'endpoint-address',
      nodeId: ' peer-node ',
      directAddresses: [' 127.0.0.1:4433 ', '127.0.0.1:4433'],
      relayUrl: ' https://relay.example./ ',
    },
    alpn: ' example/1 ',
    timeoutMs: 4500.9,
  });

  assert.deepEqual(connectTargetCalls, [[
    'endpoint-address',
    'peer-node',
    undefined,
    ['127.0.0.1:4433'],
    'https://relay.example./',
    'example/1',
    4500,
  ]]);
  await stream.close();
});

test('typed official endpoint ticket does not require a duplicate node id', async () => {
  const { bridge, connectTargetCalls } = loadBridgeRuntime();
  const session = await bridge.openTargetSession({
    target: {
      kind: 'endpoint-ticket',
      ticket: ' endpointexample ',
    },
    alpn: 'example/1',
  });
  const stream = await session.openStream();

  assert.deepEqual(connectTargetCalls, [[
    'endpoint-ticket',
    undefined,
    'endpointexample',
    undefined,
    undefined,
    'example/1',
    undefined,
  ]]);
  await session.close();
  assert.equal(stream.isClosed(), true);
});

test('typed target validation rejects ambiguous or incomplete addressing', async () => {
  const { bridge, connectTargetCalls } = loadBridgeRuntime();

  await assert.rejects(
    bridge.connectTarget({
      target: { kind: 'endpoint-address', nodeId: 'peer-node' },
      alpn: 'example/1',
    }),
    /requires a direct address or relayUrl/,
  );
  await assert.rejects(
    bridge.connectTarget({
      target: { kind: 'endpoint-ticket', ticket: '' },
      alpn: 'example/1',
    }),
    /requires a non-empty ticket/,
  );
  await assert.rejects(
    bridge.connectTarget({
      target: {
        kind: 'endpoint-ticket',
        ticket: 'endpointexample',
        nodeId: 'ambiguous-peer',
      },
      alpn: 'example/1',
    }),
    /accepts only the ticket field/,
  );
  assert.equal(connectTargetCalls.length, 0);
});

test('native failures expose a stable IrohBridgeError code', async () => {
  const { api, bridge, runtime } = loadBridgeRuntime();
  runtime.connectTarget = () => {
    throw {
      tag: 'InvalidTicket',
      inner: { message: 'could not decode ticket' },
    };
  };

  await assert.rejects(
    bridge.connectTarget({
      target: { kind: 'endpoint-ticket', ticket: 'endpointinvalid' },
      alpn: 'example/1',
    }),
    (error) => {
      assert.equal(error instanceof api.IrohBridgeError, true);
      assert.equal(error.code, 'INVALID_TICKET');
      assert.equal(
        error.message,
        'IrohBridgeError.InvalidTicket: could not decode ticket',
      );
      return true;
    },
  );
});

test('TCP forwarder passes a validated target and preamble to native and reports numeric stats', async () => {
  const { bridge, forwarderCalls, stoppedForwarders } = loadBridgeRuntime();
  const forwarder = await bridge.startTcpForwarder({
    target: { kind: 'endpoint-address', nodeId: ' peer-node ', directAddresses: ['127.0.0.1:4433'] },
    alpn: 'example/1',
    preamble: Uint8Array.from([84, 77, 72, 83, 1]),
  });
  assert.equal(forwarder.port, 41234);
  assert.equal(forwarderCalls.length, 1);
  const call = forwarderCalls[0];
  assert.equal(call.targetKind, 'endpoint-address');
  assert.equal(call.nodeId, 'peer-node');
  assert.equal(call.listenPort, 0);
  assert.deepEqual([...new Uint8Array(call.preamble)], [84, 77, 72, 83, 1]);
  assert.deepEqual(forwarder.stats(), {
    activeConnections: 1,
    totalConnections: 3,
    failedStreams: 0,
    bytesUp: 120,
    bytesDown: 64000,
    activeDownMs: 500,
  });
  await forwarder.stop();
  await forwarder.stop();
  assert.deepEqual(stoppedForwarders, ['tcp-forwarder-1']);
  assert.equal(forwarder.isStopped(), true);
});

test('TCP forwarder rejects invalid ports before crossing the native boundary', async () => {
  const { bridge, forwarderCalls } = loadBridgeRuntime();
  await assert.rejects(
    bridge.startTcpForwarder({ ...options, listenPort: 70000 }),
    /listenPort/,
  );
  assert.equal(forwarderCalls.length, 0);
});
