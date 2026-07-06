'use strict';

let reactNative = null;
try {
  reactNative = require('react-native');
} catch {
  reactNative = null;
}

const MODULE_NAME = 'MusicHubIroh';
const NativeModules = reactNative?.NativeModules || {};
const NativeEventEmitter = reactNative?.NativeEventEmitter || null;
const Platform = reactNative?.Platform || { OS: 'unknown' };
const nativeModule = NativeModules[MODULE_NAME] || null;
const emitter = nativeModule && NativeEventEmitter ? new NativeEventEmitter(nativeModule) : null;
let generatedRuntime = null;
let generatedRuntimeError = null;

function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value);
  if (value && typeof value === 'object' && Array.isArray(value.bytes)) {
    return Uint8Array.from(value.bytes);
  }
  return new Uint8Array();
}

function bytesToPayload(data) {
  return Array.from(data instanceof Uint8Array ? data : Uint8Array.from(data));
}

function requireNativeModule() {
  if (!nativeModule) {
    throw new Error(`Native module ${MODULE_NAME} is not installed for ${Platform.OS}`);
  }
  return nativeModule;
}

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
    start() {
      callRuntime(() => runtime.start());
      return Promise.resolve();
    },
    stop() {
      callRuntime(() => runtime.stop());
      return Promise.resolve();
    },
    isRunning() {
      return callRuntime(() => runtime.isRunning());
    },
    async connect(nodeId, relayUrl) {
      const connectionId = callRuntime(() => runtime.connect(nodeId, relayUrl || undefined));
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

  if (!nativeModule) return null;
  const mod = requireNativeModule();

  return {
    bridgeVersion() {
      return mod.bridgeVersion();
    },
    nodeId() {
      return mod.nodeId();
    },
    start() {
      return mod.start();
    },
    stop() {
      return mod.stop();
    },
    isRunning() {
      return mod.isRunning();
    },
    async connect(nodeId, relayUrl) {
      const connectionId = await mod.connect(nodeId, relayUrl || null);
      return {
        async send(data) {
          await mod.send(connectionId, bytesToPayload(data));
        },
        onMessage(handler) {
          if (!emitter) return () => {};
          const subscription = emitter.addListener('MusicHubIrohMessage', (event) => {
            if (!event || event.connectionId !== connectionId) return;
            handler(toUint8Array(event.data));
          });
          return () => subscription.remove();
        },
        close() {
          return mod.close(connectionId);
        },
      };
    },
  };
}

module.exports = {
  MODULE_NAME,
  getIrohBridge,
  default: getIrohBridge,
};
