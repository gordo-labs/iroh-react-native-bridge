'use strict';

let reactNative = null;
try {
  reactNative = require('react-native');
} catch {
  reactNative = null;
}

const MODULE_NAME = 'IrohBridge';
const Platform = reactNative?.Platform || { OS: 'unknown' };
let generatedRuntime = null;
let generatedRuntimeError = null;

class IrohBridgeError extends Error {
  constructor(message, code = 'UNKNOWN', cause) {
    super(message);
    this.name = 'IrohBridgeError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

function errorCodeFor(tag, message) {
  const tagCodes = {
    AlreadyStarted: 'ALREADY_STARTED',
    NotStarted: 'NOT_STARTED',
    NotConnected: 'NOT_CONNECTED',
    InvalidNodeId: 'INVALID_NODE_ID',
    InvalidAddress: 'INVALID_ADDRESS',
    InvalidTicket: 'INVALID_TICKET',
    InvalidDialTarget: 'INVALID_DIAL_TARGET',
    InvalidFrame: 'INVALID_FRAME',
    InternalError: 'INTERNAL',
  };
  if (typeof tag === 'string' && tagCodes[tag]) return tagCodes[tag];
  if (message.includes('connect timed out')) return 'DIAL_TIMEOUT';
  if (message.includes('stream open timed out')) return 'STREAM_OPEN_TIMEOUT';
  if (message.includes('send queue is full')) return 'BACKPRESSURE';
  if (tag === 'OperationFailed') return 'OPERATION_FAILED';
  return 'UNKNOWN';
}

function toArrayBuffer(data) {
  const bytes = data instanceof Uint8Array ? data : Uint8Array.from(data || []);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function normalizeRustError(error) {
  if (error instanceof IrohBridgeError) return error;
  if (!error) return new IrohBridgeError('Iroh native bridge failed');
  const tag = typeof error === 'object' && error ? error.tag : null;
  const inner = typeof error === 'object' && error ? error.inner : null;
  const innerMessage =
    inner && typeof inner === 'object' && typeof inner.message === 'string'
      ? inner.message
      : null;
  const message =
    typeof tag === 'string' && innerMessage
      ? `IrohBridgeError.${tag}: ${innerMessage}`
      : typeof tag === 'string'
        ? `IrohBridgeError.${tag}`
        : typeof error === 'object' && typeof error.message === 'string'
          ? error.message
          : String(error);
  return new IrohBridgeError(message, errorCodeFor(tag, message), error);
}

function callRuntime(fn) {
  try {
    return fn();
  } catch (error) {
    throw normalizeRustError(error);
  }
}

function normalizeStartOptions(options) {
  if (options == null) return undefined;
  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Iroh start options must be an object');
  }
  if (options.alpns == null) return undefined;
  if (!Array.isArray(options.alpns)) {
    throw new TypeError('Iroh start options alpns must be an array');
  }
  return options.alpns.map((alpn) => {
    if (typeof alpn !== 'string' || alpn.trim().length === 0) {
      throw new TypeError('Iroh ALPN values must be non-empty strings');
    }
    return alpn;
  });
}

function normalizeConnectOptions(options) {
  if (typeof options !== 'object' || options == null || Array.isArray(options)) {
    throw new TypeError('Iroh connect expects { nodeId, alpn, addressHint?, timeoutMs? }');
  }
  const nodeId = options.nodeId;
  const alpn = options.alpn;
  const addressHint = options.addressHint;
  const timeoutMs = options.timeoutMs;
  if (typeof nodeId !== 'string' || nodeId.trim().length === 0) {
    throw new TypeError('Iroh connect nodeId must be a non-empty string');
  }
  if (typeof alpn !== 'string' || alpn.trim().length === 0) {
    throw new TypeError('Iroh connect alpn must be a non-empty string');
  }
  if (addressHint != null && typeof addressHint !== 'string') {
    throw new TypeError('Iroh connect addressHint must be a string when provided');
  }
  if (timeoutMs != null && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
    throw new TypeError('Iroh connect timeoutMs must be a positive number when provided');
  }
  return {
    nodeId,
    alpn,
    addressHint: addressHint || undefined,
    timeoutMs: timeoutMs == null ? undefined : Math.floor(timeoutMs),
  };
}

function normalizeConnectTargetOptions(options) {
  if (typeof options !== 'object' || options == null || Array.isArray(options)) {
    throw new TypeError('Iroh connectTarget expects { target, alpn, timeoutMs? }');
  }
  const target = options.target;
  const alpn = options.alpn;
  const timeoutMs = options.timeoutMs;
  if (typeof alpn !== 'string' || alpn.trim().length === 0) {
    throw new TypeError('Iroh connectTarget alpn must be a non-empty string');
  }
  if (timeoutMs != null && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
    throw new TypeError('Iroh connectTarget timeoutMs must be a positive number when provided');
  }
  if (typeof target !== 'object' || target == null || Array.isArray(target)) {
    throw new TypeError('Iroh connectTarget target must be an object');
  }

  if (target.kind === 'endpoint-ticket') {
    if (typeof target.ticket !== 'string' || target.ticket.trim().length === 0) {
      throw new TypeError('Iroh endpoint-ticket target requires a non-empty ticket');
    }
    if (
      target.nodeId != null ||
      target.directAddresses != null ||
      target.relayUrl != null
    ) {
      throw new TypeError('Iroh endpoint-ticket target accepts only the ticket field');
    }
    return {
      targetKind: target.kind,
      nodeId: undefined,
      endpointTicket: target.ticket.trim(),
      directAddresses: undefined,
      relayUrl: undefined,
      alpn: alpn.trim(),
      timeoutMs: timeoutMs == null ? undefined : Math.floor(timeoutMs),
    };
  }

  if (target.kind === 'endpoint-address') {
    if (target.ticket != null) {
      throw new TypeError('Iroh endpoint-address target does not accept a ticket');
    }
    if (typeof target.nodeId !== 'string' || target.nodeId.trim().length === 0) {
      throw new TypeError('Iroh endpoint-address target requires a non-empty nodeId');
    }
    if (target.directAddresses != null && !Array.isArray(target.directAddresses)) {
      throw new TypeError('Iroh endpoint-address directAddresses must be an array');
    }
    const directAddresses = (target.directAddresses || []).map((address) => {
      if (typeof address !== 'string' || address.trim().length === 0) {
        throw new TypeError('Iroh direct addresses must be non-empty strings');
      }
      return address.trim();
    });
    if (target.relayUrl != null && (
      typeof target.relayUrl !== 'string' || target.relayUrl.trim().length === 0
    )) {
      throw new TypeError('Iroh endpoint-address relayUrl must be a non-empty string');
    }
    const relayUrl = target.relayUrl?.trim();
    if (directAddresses.length === 0 && !relayUrl) {
      throw new TypeError(
        'Iroh endpoint-address target requires a direct address or relayUrl',
      );
    }
    return {
      targetKind: target.kind,
      nodeId: target.nodeId.trim(),
      endpointTicket: undefined,
      directAddresses: directAddresses.length > 0 ? [...new Set(directAddresses)] : undefined,
      relayUrl,
      alpn: alpn.trim(),
      timeoutMs: timeoutMs == null ? undefined : Math.floor(timeoutMs),
    };
  }

  throw new TypeError(
    'Iroh connectTarget target.kind must be "endpoint-ticket" or "endpoint-address"',
  );
}

function normalizeTcpForwarderOptions(options) {
  if (typeof options !== 'object' || options == null || Array.isArray(options)) {
    throw new TypeError(
      'Iroh startTcpForwarder expects { nodeId, alpn, addressHint? } or { target, alpn }',
    );
  }
  const dial = options.target != null
    ? normalizeConnectTargetOptions(options)
    : { targetKind: undefined, endpointTicket: undefined, directAddresses: undefined,
        relayUrl: undefined, ...normalizeConnectOptions(options) };
  const listenPort = options.listenPort ?? 0;
  if (!Number.isInteger(listenPort) || listenPort < 0 || listenPort > 65535) {
    throw new TypeError('Iroh startTcpForwarder listenPort must be an integer from 0 to 65535');
  }
  let preamble;
  if (options.preamble != null) {
    if (!(options.preamble instanceof Uint8Array) && !Array.isArray(options.preamble)) {
      throw new TypeError('Iroh startTcpForwarder preamble must be a Uint8Array');
    }
    preamble = toArrayBuffer(options.preamble);
  }
  return {
    nodeId: dial.nodeId,
    alpn: dial.alpn,
    addressHint: dial.addressHint,
    targetKind: dial.targetKind,
    endpointTicket: dial.endpointTicket,
    directAddresses: dial.directAddresses,
    relayUrl: dial.relayUrl,
    listenPort,
    preamble,
    timeoutMs: dial.timeoutMs,
  };
}

function toNumberStats(stats) {
  return {
    activeConnections: Number(stats.activeConnections),
    totalConnections: Number(stats.totalConnections),
    failedStreams: Number(stats.failedStreams),
    bytesUp: Number(stats.bytesUp),
    bytesDown: Number(stats.bytesDown),
    activeDownMs: Number(stats.activeDownMs),
  };
}

function resolveGeneratedRuntime() {
  if (generatedRuntime) return generatedRuntime;
  if (generatedRuntimeError) return null;

  try {
    const installer = require('./NativeIrohBridge');
    const nativeInstaller = installer.default || installer;
    if (!nativeInstaller || typeof nativeInstaller.installRustCrate !== 'function') {
      throw new Error('Iroh JSI installer is not available');
    }
    nativeInstaller.installRustCrate();
    generatedRuntime = require('./generated/iroh_mobile_bridge.js');
    return generatedRuntime;
  } catch (error) {
    generatedRuntimeError = normalizeRustError(error);
    return null;
  }
}

function getGeneratedIrohBridge() {
  const runtime = resolveGeneratedRuntime();
  if (!runtime) return null;

  const createStream = (connectionId) => {
    const messageHandlers = new Set();
    const closeHandlers = new Set();
    const errorHandlers = new Set();
    let closed = false;
    let pumping = false;
    let sendTail = Promise.resolve();

    const emitClose = () => {
      if (closed) return;
      closed = true;
      for (const handler of closeHandlers) {
        try { handler(); } catch {}
      }
    };
    const emitError = (error) => {
      const normalized = normalizeRustError(error);
      for (const handler of errorHandlers) {
        try { handler(normalized); } catch {}
      }
      return normalized;
    };
    const hasPumpObservers = () => messageHandlers.size > 0 || closeHandlers.size > 0;
    const pump = async () => {
      if (pumping || closed || !hasPumpObservers()) return;
      pumping = true;
      let idlePolls = 0;
      try {
        while (!closed && hasPumpObservers()) {
          const next = messageHandlers.size > 0
            ? callRuntime(() => runtime.nextMessage(connectionId, 0n))
            : null;
          if (next) {
            idlePolls = 0;
            const bytes = new Uint8Array(next);
            for (const handler of messageHandlers) {
              try { handler(bytes); } catch (error) { emitError(error); }
            }
          } else if (
            typeof runtime.isStreamOpen === 'function' &&
            !callRuntime(() => runtime.isStreamOpen(connectionId))
          ) {
            try { callRuntime(() => runtime.close(connectionId)); } catch {}
            emitClose();
            break;
          } else {
            idlePolls += 1;
          }
          const delayMs = next ? 0 : messageHandlers.size === 0 ? 50 : idlePolls < 20 ? 10 : 50;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        emitError(error);
        try { callRuntime(() => runtime.close(connectionId)); } catch {}
        emitClose();
      } finally {
        pumping = false;
        if (!closed && hasPumpObservers()) void pump();
      }
    };

    const stream = {
      send(data) {
        const payload = toArrayBuffer(data);
        const operation = sendTail.then(async () => {
          if (closed) throw new Error('Iroh stream is closed');
          const startedAt = Date.now();
          for (;;) {
            try {
              callRuntime(() => runtime.send(connectionId, payload));
              return;
            } catch (error) {
              const normalized = normalizeRustError(error);
              const backpressured = normalized.message.includes('send queue is full');
              if (!backpressured || closed || Date.now() - startedAt >= 30_000) {
                throw emitError(normalized);
              }
              await new Promise((resolve) => setTimeout(resolve, 5));
            }
          }
        });
        sendTail = operation.catch(() => {});
        return operation;
      },
      onMessage(handler) {
        if (typeof handler !== 'function') {
          throw new TypeError('Iroh onMessage handler must be a function');
        }
        if (closed) return () => {};
        messageHandlers.add(handler);
        void pump();
        return () => messageHandlers.delete(handler);
      },
      onClose(handler) {
        if (typeof handler !== 'function') {
          throw new TypeError('Iroh onClose handler must be a function');
        }
        if (closed) {
          void Promise.resolve().then(handler);
          return () => {};
        }
        closeHandlers.add(handler);
        void pump();
        return () => closeHandlers.delete(handler);
      },
      onError(handler) {
        if (typeof handler !== 'function') {
          throw new TypeError('Iroh onError handler must be a function');
        }
        errorHandlers.add(handler);
        return () => errorHandlers.delete(handler);
      },
      isClosed() {
        return closed;
      },
      close() {
        if (!closed) {
          try {
            callRuntime(() => runtime.close(connectionId));
          } finally {
            emitClose();
          }
        }
        return Promise.resolve();
      },
    };
    return stream;
  };

  const connectStream = async (options) => {
    const connectOptions = normalizeConnectOptions(options);
    const connectionId = callRuntime(() =>
      runtime.connect(
        connectOptions.nodeId,
        connectOptions.alpn,
        connectOptions.addressHint,
        connectOptions.timeoutMs,
      ),
    );
    return createStream(connectionId);
  };

  const connectNormalizedTargetStream = async (connectOptions) => {
    if (typeof runtime.connectTarget !== 'function') {
      throw new IrohBridgeError(
        'Installed Iroh native runtime does not support typed dial targets',
        'UNSUPPORTED_NATIVE_API',
      );
    }
    const connectionId = callRuntime(() =>
      runtime.connectTarget(
        connectOptions.targetKind,
        connectOptions.nodeId,
        connectOptions.endpointTicket,
        connectOptions.directAddresses,
        connectOptions.relayUrl,
        connectOptions.alpn,
        connectOptions.timeoutMs,
      ),
    );
    return createStream(connectionId);
  };

  const connectTargetStream = async (options) =>
    connectNormalizedTargetStream(normalizeConnectTargetOptions(options));

  const openLogicalSession = async (openStream) => {
    const streams = new Set();
    let closed = false;
    return {
      async openStream() {
        if (closed) throw new Error('Iroh session is closed');
        const stream = await openStream();
        if (closed) {
          await stream.close();
          throw new Error('Iroh session closed while opening a stream');
        }
        streams.add(stream);
        stream.onClose(() => streams.delete(stream));
        return stream;
      },
      isClosed() {
        return closed;
      },
      async close() {
        if (closed) return;
        closed = true;
        const active = [...streams];
        streams.clear();
        await Promise.allSettled(active.map((stream) => stream.close()));
      },
    };
  };

  return {
    bridgeVersion() {
      return callRuntime(() => runtime.bridgeVersion());
    },
    nodeId() {
      return callRuntime(() => runtime.nodeId());
    },
    start(options) {
      const alpns = normalizeStartOptions(options);
      callRuntime(() => runtime.start(alpns));
      return Promise.resolve();
    },
    stop() {
      callRuntime(() => runtime.stop());
      return Promise.resolve();
    },
    isRunning() {
      return callRuntime(() => runtime.isRunning());
    },
    connect(options) {
      return connectStream(options);
    },
    connectTarget(options) {
      return connectTargetStream(options);
    },
    async openSession(options) {
      const connectOptions = normalizeConnectOptions(options);
      return openLogicalSession(() => connectStream(connectOptions));
    },
    async openTargetSession(options) {
      const connectOptions = normalizeConnectTargetOptions(options);
      return openLogicalSession(() => connectNormalizedTargetStream(connectOptions));
    },
    async startTcpForwarder(options) {
      if (typeof runtime.startTcpForwarder !== 'function') {
        throw new IrohBridgeError(
          'Installed Iroh native runtime does not support TCP forwarding',
          'UNSUPPORTED_NATIVE_API',
        );
      }
      const forwarderOptions = normalizeTcpForwarderOptions(options);
      const info = callRuntime(() => runtime.startTcpForwarder(forwarderOptions));
      const id = info.id;
      let stopped = false;
      return {
        id,
        port: Number(info.port),
        stats() {
          return toNumberStats(callRuntime(() => runtime.tcpForwarderStats(id)));
        },
        stop() {
          if (!stopped) {
            stopped = true;
            callRuntime(() => runtime.stopTcpForwarder(id));
          }
          return Promise.resolve();
        },
        isStopped() {
          return stopped;
        },
      };
    },
  };
}

function getUnavailableIrohBridge(error) {
  const unavailable = normalizeRustError(error);
  return {
    bridgeVersion() {
      return `unavailable: ${unavailable.message}`;
    },
    nodeId() {
      return '';
    },
    start() {
      return Promise.reject(unavailable);
    },
    stop() {
      return Promise.resolve();
    },
    isRunning() {
      return false;
    },
    async connect() {
      throw unavailable;
    },
    async connectTarget() {
      throw unavailable;
    },
    async openSession() {
      throw unavailable;
    },
    async openTargetSession() {
      throw unavailable;
    },
    async startTcpForwarder() {
      throw unavailable;
    },
  };
}

function getIrohBridge() {
  const generated = getGeneratedIrohBridge();
  if (generated) return generated;
  if (generatedRuntimeError) {
    return getUnavailableIrohBridge(generatedRuntimeError);
  }
  return getUnavailableIrohBridge(
    new Error(`IrohBridge TurboModule is not installed for ${Platform.OS}`),
  );
}

module.exports = {
  IrohBridgeError,
  MODULE_NAME,
  getIrohBridge,
  default: getIrohBridge,
};
