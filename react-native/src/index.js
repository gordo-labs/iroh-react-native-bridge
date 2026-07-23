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

function toArrayBuffer(data) {
  const bytes = data instanceof Uint8Array ? data : Uint8Array.from(data || []);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function normalizeRustError(error) {
  if (!error) return new Error('Iroh native bridge failed');
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
  if (error instanceof Error && error.message === message) return error;
  const normalized = new Error(message);
  if (error instanceof Error) {
    normalized.cause = error;
  }
  return normalized;
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
    async openSession(options) {
      const connectOptions = normalizeConnectOptions(options);
      const streams = new Set();
      let closed = false;
      return {
        async openStream() {
          if (closed) throw new Error('Iroh session is closed');
          const stream = await connectStream(connectOptions);
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
    async openSession() {
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
  MODULE_NAME,
  getIrohBridge,
  default: getIrohBridge,
};
