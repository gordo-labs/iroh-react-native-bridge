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

function getIrohBridge() {
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
