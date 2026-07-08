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
    async connect(options) {
      const connectOptions = normalizeConnectOptions(options);
      const connectionId = callRuntime(() =>
        runtime.connect(
          connectOptions.nodeId,
          connectOptions.alpn,
          connectOptions.addressHint,
          connectOptions.timeoutMs,
        ),
      );
      return {
        async send(data) {
          callRuntime(() => runtime.send(connectionId, toArrayBuffer(data)));
        },
        onMessage(handler) {
          let closed = false;
          const pump = async () => {
            while (!closed) {
              try {
                const next = callRuntime(() => runtime.nextMessage(connectionId, 0n));
                if (!closed && next) {
                  handler(new Uint8Array(next));
                }
              } catch {
                closed = true;
              }
              await new Promise((resolve) => setTimeout(resolve, closed ? 0 : 10));
            }
          };
          void pump();
          return () => {
            closed = true;
          };
        },
        close() {
          callRuntime(() => runtime.close(connectionId));
          return Promise.resolve();
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
