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
  if (error instanceof Error) return error;
  if (typeof error === 'object' && typeof error.message === 'string') {
    return new Error(error.message);
  }
  return new Error(String(error));
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
      return runtime.bridgeVersion();
    },
    nodeId() {
      return runtime.nodeId();
    },
    start() {
      runtime.start();
      return Promise.resolve();
    },
    stop() {
      runtime.stop();
      return Promise.resolve();
    },
    isRunning() {
      return runtime.isRunning();
    },
    async connect(nodeId, relayUrl) {
      const connectionId = runtime.connect(nodeId, relayUrl || undefined);
      return {
        async send(data) {
          runtime.send(connectionId, toArrayBuffer(data));
        },
        onMessage(handler) {
          let closed = false;
          const pump = async () => {
            while (!closed) {
              try {
                const next = runtime.nextMessage(connectionId, 0n);
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
          runtime.close(connectionId);
          return Promise.resolve();
        },
      };
    },
  };
}

function getIrohBridge() {
  const generated = getGeneratedIrohBridge();
  if (generated) return generated;

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
