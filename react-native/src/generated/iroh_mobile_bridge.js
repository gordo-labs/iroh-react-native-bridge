var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/generated/iroh_mobile_bridge.ts
var iroh_mobile_bridge_exports = {};
__export(iroh_mobile_bridge_exports, {
  IrohBridgeError: () => IrohBridgeError,
  IrohBridgeError_Tags: () => IrohBridgeError_Tags,
  bridgeVersion: () => bridgeVersion,
  close: () => close,
  connect: () => connect,
  default: () => iroh_mobile_bridge_default,
  echoRoundtrip: () => echoRoundtrip,
  isRunning: () => isRunning,
  nextMessage: () => nextMessage,
  nodeId: () => nodeId,
  send: () => send,
  start: () => start,
  stop: () => stop
});
module.exports = __toCommonJS(iroh_mobile_bridge_exports);

// src/generated/iroh_mobile_bridge-ffi.ts
var getter = () => globalThis.NativeIrohMobileBridge;
var iroh_mobile_bridge_ffi_default = getter;

// src/generated/iroh_mobile_bridge.ts
var import_core = require("@ubjs/core");
var uniffiCaller = new import_core.UniffiRustCaller(() => ({ code: 0 }));
function bridgeVersion() {
  return ((__rb) => {
    try {
      return FfiConverterString.lift(__rb);
    } finally {
      iroh_mobile_bridge_ffi_default().rustbuffer_free(__rb);
    }
  })(uniffiCaller.rustCall(
    /*caller:*/
    (callStatus) => {
      return iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_fn_func_bridge_version(
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  ));
}
function close(connectionId) {
  uniffiCaller.rustCallWithError(
    /*liftError:*/
    FfiConverterTypeIrohBridgeError.lift.bind(FfiConverterTypeIrohBridgeError),
    /*caller:*/
    (callStatus) => {
      iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_fn_func_close(
        FfiConverterString.lower(connectionId, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  );
}
function connect(nodeId2, alpn, addressHint, timeoutMs) {
  return ((__rb) => {
    try {
      return FfiConverterString.lift(__rb);
    } finally {
      iroh_mobile_bridge_ffi_default().rustbuffer_free(__rb);
    }
  })(uniffiCaller.rustCallWithError(
    /*liftError:*/
    FfiConverterTypeIrohBridgeError.lift.bind(FfiConverterTypeIrohBridgeError),
    /*caller:*/
    (callStatus) => {
      return iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_fn_func_connect(
        FfiConverterString.lower(nodeId2, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        FfiConverterString.lower(alpn, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        FfiConverterOptionalString.lower(addressHint, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        FfiConverterOptionalUInt32.lower(timeoutMs, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  ));
}
function echoRoundtrip(input) {
  return ((__rb) => {
    try {
      return FfiConverterString.lift(__rb);
    } finally {
      iroh_mobile_bridge_ffi_default().rustbuffer_free(__rb);
    }
  })(uniffiCaller.rustCall(
    /*caller:*/
    (callStatus) => {
      return iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_fn_func_echo_roundtrip(
        FfiConverterString.lower(input, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  ));
}
function isRunning() {
  return import_core.FfiConverterBool.lift(uniffiCaller.rustCall(
    /*caller:*/
    (callStatus) => {
      return iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_fn_func_is_running(
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  ));
}
function nextMessage(connectionId, timeoutMs) {
  return ((__rb) => {
    try {
      return FfiConverterOptionalBytes.lift(__rb);
    } finally {
      iroh_mobile_bridge_ffi_default().rustbuffer_free(__rb);
    }
  })(uniffiCaller.rustCallWithError(
    /*liftError:*/
    FfiConverterTypeIrohBridgeError.lift.bind(FfiConverterTypeIrohBridgeError),
    /*caller:*/
    (callStatus) => {
      return iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_fn_func_next_message(
        FfiConverterString.lower(connectionId, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        import_core.FfiConverterUInt64.lower(timeoutMs, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  ));
}
function nodeId() {
  return ((__rb) => {
    try {
      return FfiConverterString.lift(__rb);
    } finally {
      iroh_mobile_bridge_ffi_default().rustbuffer_free(__rb);
    }
  })(uniffiCaller.rustCall(
    /*caller:*/
    (callStatus) => {
      return iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_fn_func_node_id(
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  ));
}
function send(connectionId, data) {
  uniffiCaller.rustCallWithError(
    /*liftError:*/
    FfiConverterTypeIrohBridgeError.lift.bind(FfiConverterTypeIrohBridgeError),
    /*caller:*/
    (callStatus) => {
      iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_fn_func_send(
        FfiConverterString.lower(connectionId, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        import_core.FfiConverterArrayBuffer.lower(data, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  );
}
function start(alpns) {
  uniffiCaller.rustCallWithError(
    /*liftError:*/
    FfiConverterTypeIrohBridgeError.lift.bind(FfiConverterTypeIrohBridgeError),
    /*caller:*/
    (callStatus) => {
      iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_fn_func_start(
        FfiConverterOptionalSequenceString.lower(alpns, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  );
}
function stop() {
  uniffiCaller.rustCall(
    /*caller:*/
    (callStatus) => {
      iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_fn_func_stop(
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  );
}
var stringConverter = (() => {
  const encoder = new TextEncoder();
  const decoder = typeof TextDecoder !== "undefined" ? new TextDecoder() : {
    decode: (bytes) => iroh_mobile_bridge_ffi_default().ubrn_uniffi_internal_fn_func_ffi__string_from_buffer(
      bytes,
      void 0
    )
  };
  return {
    // Single-string lower() uses the C++ helper — TextEncoder.encode
    // measured ~43% slower on takeString benchmarks.
    stringToBytes: (s) => iroh_mobile_bridge_ffi_default().ubrn_uniffi_internal_fn_func_ffi__string_to_buffer(s, void 0),
    bytesToString: (ab) => decoder.decode(ab),
    // Direct C++ call — bypasses uniffiCaller.rustCall() overhead.
    // Matters for N-element arrays.
    stringByteLength: (s) => iroh_mobile_bridge_ffi_default().ubrn_uniffi_internal_fn_func_ffi__string_to_byte_length(s, void 0),
    // Encode directly into the RustBuffer backing store via
    // TextEncoder.encodeInto — zero intermediate allocation. Replaces
    // the old C++ write_string_into_buffer helper.
    writeStringIntoBuffer: (s, buf, offset) => {
      const view = new Uint8Array(
        buf.arrayBuffer,
        offset,
        buf.arrayBuffer.byteLength - offset
      );
      return encoder.encodeInto(s, view).written;
    },
    // Dedicated C++ helper — avoids per-read Uint8Array allocation and
    // the double property-lookup in string_from_buffer.
    readStringFromBuffer: (buf, offset, length) => iroh_mobile_bridge_ffi_default().ubrn_uniffi_internal_fn_func_ffi__read_string_from_buffer(buf, offset, length)
  };
})();
var FfiConverterString = (0, import_core.uniffiCreateFfiConverterString)(stringConverter);
var IrohBridgeError_Tags = /* @__PURE__ */ ((IrohBridgeError_Tags2) => {
  IrohBridgeError_Tags2["AlreadyStarted"] = "AlreadyStarted";
  IrohBridgeError_Tags2["NotStarted"] = "NotStarted";
  IrohBridgeError_Tags2["NotConnected"] = "NotConnected";
  IrohBridgeError_Tags2["InvalidNodeId"] = "InvalidNodeId";
  IrohBridgeError_Tags2["InvalidFrame"] = "InvalidFrame";
  IrohBridgeError_Tags2["OperationFailed"] = "OperationFailed";
  IrohBridgeError_Tags2["InternalError"] = "InternalError";
  return IrohBridgeError_Tags2;
})(IrohBridgeError_Tags || {});
var IrohBridgeError = (() => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  class AlreadyStarted_ extends (_b = import_core.UniffiError, _a = import_core.uniffiTypeNameSymbol, _b) {
    constructor() {
      super("IrohBridgeError", "AlreadyStarted");
      /**
       * @private
       * This field is private and should not be used, use `tag` instead.
       */
      __publicField(this, _a, "IrohBridgeError");
      __publicField(this, "tag", "AlreadyStarted" /* AlreadyStarted */);
    }
    static new() {
      return new AlreadyStarted_();
    }
    static instanceOf(obj) {
      return obj.tag === "AlreadyStarted" /* AlreadyStarted */;
    }
    static hasInner(obj) {
      return false;
    }
  }
  class NotStarted_ extends (_d = import_core.UniffiError, _c = import_core.uniffiTypeNameSymbol, _d) {
    constructor() {
      super("IrohBridgeError", "NotStarted");
      /**
       * @private
       * This field is private and should not be used, use `tag` instead.
       */
      __publicField(this, _c, "IrohBridgeError");
      __publicField(this, "tag", "NotStarted" /* NotStarted */);
    }
    static new() {
      return new NotStarted_();
    }
    static instanceOf(obj) {
      return obj.tag === "NotStarted" /* NotStarted */;
    }
    static hasInner(obj) {
      return false;
    }
  }
  class NotConnected_ extends (_f = import_core.UniffiError, _e = import_core.uniffiTypeNameSymbol, _f) {
    constructor() {
      super("IrohBridgeError", "NotConnected");
      /**
       * @private
       * This field is private and should not be used, use `tag` instead.
       */
      __publicField(this, _e, "IrohBridgeError");
      __publicField(this, "tag", "NotConnected" /* NotConnected */);
    }
    static new() {
      return new NotConnected_();
    }
    static instanceOf(obj) {
      return obj.tag === "NotConnected" /* NotConnected */;
    }
    static hasInner(obj) {
      return false;
    }
  }
  class InvalidNodeId_ extends (_h = import_core.UniffiError, _g = import_core.uniffiTypeNameSymbol, _h) {
    constructor() {
      super("IrohBridgeError", "InvalidNodeId");
      /**
       * @private
       * This field is private and should not be used, use `tag` instead.
       */
      __publicField(this, _g, "IrohBridgeError");
      __publicField(this, "tag", "InvalidNodeId" /* InvalidNodeId */);
    }
    static new() {
      return new InvalidNodeId_();
    }
    static instanceOf(obj) {
      return obj.tag === "InvalidNodeId" /* InvalidNodeId */;
    }
    static hasInner(obj) {
      return false;
    }
  }
  class InvalidFrame_ extends (_j = import_core.UniffiError, _i = import_core.uniffiTypeNameSymbol, _j) {
    constructor() {
      super("IrohBridgeError", "InvalidFrame");
      /**
       * @private
       * This field is private and should not be used, use `tag` instead.
       */
      __publicField(this, _i, "IrohBridgeError");
      __publicField(this, "tag", "InvalidFrame" /* InvalidFrame */);
    }
    static new() {
      return new InvalidFrame_();
    }
    static instanceOf(obj) {
      return obj.tag === "InvalidFrame" /* InvalidFrame */;
    }
    static hasInner(obj) {
      return false;
    }
  }
  class OperationFailed_ extends (_l = import_core.UniffiError, _k = import_core.uniffiTypeNameSymbol, _l) {
    constructor(inner) {
      super("IrohBridgeError", "OperationFailed");
      /**
       * @private
       * This field is private and should not be used, use `tag` instead.
       */
      __publicField(this, _k, "IrohBridgeError");
      __publicField(this, "tag", "OperationFailed" /* OperationFailed */);
      __publicField(this, "inner");
      this.inner = Object.freeze(inner);
    }
    static new(inner) {
      return new OperationFailed_(inner);
    }
    static instanceOf(obj) {
      return obj.tag === "OperationFailed" /* OperationFailed */;
    }
    static hasInner(obj) {
      return OperationFailed_.instanceOf(obj);
    }
    static getInner(obj) {
      return obj.inner;
    }
  }
  class InternalError_ extends (_n = import_core.UniffiError, _m = import_core.uniffiTypeNameSymbol, _n) {
    constructor() {
      super("IrohBridgeError", "InternalError");
      /**
       * @private
       * This field is private and should not be used, use `tag` instead.
       */
      __publicField(this, _m, "IrohBridgeError");
      __publicField(this, "tag", "InternalError" /* InternalError */);
    }
    static new() {
      return new InternalError_();
    }
    static instanceOf(obj) {
      return obj.tag === "InternalError" /* InternalError */;
    }
    static hasInner(obj) {
      return false;
    }
  }
  function instanceOf(obj) {
    return obj[import_core.uniffiTypeNameSymbol] === "IrohBridgeError";
  }
  return Object.freeze({
    instanceOf,
    AlreadyStarted: AlreadyStarted_,
    NotStarted: NotStarted_,
    NotConnected: NotConnected_,
    InvalidNodeId: InvalidNodeId_,
    InvalidFrame: InvalidFrame_,
    OperationFailed: OperationFailed_,
    InternalError: InternalError_
  });
})();
var FfiConverterTypeIrohBridgeError = (() => {
  const ordinalConverter = import_core.FfiConverterInt32;
  class FFIConverter extends import_core.AbstractFfiConverterByteArray {
    read(from) {
      switch (ordinalConverter.read(from)) {
        case 1:
          return new IrohBridgeError.AlreadyStarted();
        case 2:
          return new IrohBridgeError.NotStarted();
        case 3:
          return new IrohBridgeError.NotConnected();
        case 4:
          return new IrohBridgeError.InvalidNodeId();
        case 5:
          return new IrohBridgeError.InvalidFrame();
        case 6:
          return new IrohBridgeError.OperationFailed({ message: FfiConverterString.read(from) });
        case 7:
          return new IrohBridgeError.InternalError();
        default:
          throw new import_core.UniffiInternalError.UnexpectedEnumCase();
      }
    }
    write(value, into) {
      switch (value.tag) {
        case "AlreadyStarted" /* AlreadyStarted */: {
          ordinalConverter.write(1, into);
          return;
        }
        case "NotStarted" /* NotStarted */: {
          ordinalConverter.write(2, into);
          return;
        }
        case "NotConnected" /* NotConnected */: {
          ordinalConverter.write(3, into);
          return;
        }
        case "InvalidNodeId" /* InvalidNodeId */: {
          ordinalConverter.write(4, into);
          return;
        }
        case "InvalidFrame" /* InvalidFrame */: {
          ordinalConverter.write(5, into);
          return;
        }
        case "OperationFailed" /* OperationFailed */: {
          ordinalConverter.write(6, into);
          const inner = value.inner;
          FfiConverterString.write(inner.message, into);
          return;
        }
        case "InternalError" /* InternalError */: {
          ordinalConverter.write(7, into);
          return;
        }
        default:
          throw new import_core.UniffiInternalError.UnexpectedEnumCase();
      }
    }
    allocationSize(value) {
      switch (value.tag) {
        case "AlreadyStarted" /* AlreadyStarted */: {
          return ordinalConverter.allocationSize(1);
        }
        case "NotStarted" /* NotStarted */: {
          return ordinalConverter.allocationSize(2);
        }
        case "NotConnected" /* NotConnected */: {
          return ordinalConverter.allocationSize(3);
        }
        case "InvalidNodeId" /* InvalidNodeId */: {
          return ordinalConverter.allocationSize(4);
        }
        case "InvalidFrame" /* InvalidFrame */: {
          return ordinalConverter.allocationSize(5);
        }
        case "OperationFailed" /* OperationFailed */: {
          const inner = value.inner;
          let size = ordinalConverter.allocationSize(6);
          size += FfiConverterString.allocationSize(inner.message);
          return size;
        }
        case "InternalError" /* InternalError */: {
          return ordinalConverter.allocationSize(7);
        }
        default:
          throw new import_core.UniffiInternalError.UnexpectedEnumCase();
      }
    }
  }
  return new FFIConverter();
})();
var FfiConverterOptionalString = new import_core.FfiConverterOptional(FfiConverterString);
var FfiConverterOptionalUInt32 = new import_core.FfiConverterOptional(import_core.FfiConverterUInt32);
var FfiConverterOptionalBytes = new import_core.FfiConverterOptional(import_core.FfiConverterArrayBuffer);
var FfiConverterSequenceString = new import_core.FfiConverterArray(FfiConverterString);
var FfiConverterOptionalSequenceString = new import_core.FfiConverterOptional(FfiConverterSequenceString);
function uniffiEnsureInitialized() {
  const bindingsContractVersion = 30;
  const scaffoldingContractVersion = iroh_mobile_bridge_ffi_default().ubrn_ffi_iroh_mobile_bridge_uniffi_contract_version();
  if (bindingsContractVersion !== scaffoldingContractVersion) {
    throw new import_core.UniffiInternalError.ContractVersionMismatch(scaffoldingContractVersion, bindingsContractVersion);
  }
  if (iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_checksum_func_bridge_version() !== 53151) {
    throw new import_core.UniffiInternalError.ApiChecksumMismatch("uniffi_iroh_mobile_bridge_checksum_func_bridge_version");
  }
  if (iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_checksum_func_close() !== 50746) {
    throw new import_core.UniffiInternalError.ApiChecksumMismatch("uniffi_iroh_mobile_bridge_checksum_func_close");
  }
  if (iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_checksum_func_connect() !== 8623) {
    throw new import_core.UniffiInternalError.ApiChecksumMismatch("uniffi_iroh_mobile_bridge_checksum_func_connect");
  }
  if (iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_checksum_func_echo_roundtrip() !== 22986) {
    throw new import_core.UniffiInternalError.ApiChecksumMismatch("uniffi_iroh_mobile_bridge_checksum_func_echo_roundtrip");
  }
  if (iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_checksum_func_is_running() !== 59482) {
    throw new import_core.UniffiInternalError.ApiChecksumMismatch("uniffi_iroh_mobile_bridge_checksum_func_is_running");
  }
  if (iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_checksum_func_next_message() !== 56656) {
    throw new import_core.UniffiInternalError.ApiChecksumMismatch("uniffi_iroh_mobile_bridge_checksum_func_next_message");
  }
  if (iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_checksum_func_node_id() !== 22079) {
    throw new import_core.UniffiInternalError.ApiChecksumMismatch("uniffi_iroh_mobile_bridge_checksum_func_node_id");
  }
  if (iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_checksum_func_send() !== 17431) {
    throw new import_core.UniffiInternalError.ApiChecksumMismatch("uniffi_iroh_mobile_bridge_checksum_func_send");
  }
  if (iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_checksum_func_start() !== 42673) {
    throw new import_core.UniffiInternalError.ApiChecksumMismatch("uniffi_iroh_mobile_bridge_checksum_func_start");
  }
  if (iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_checksum_func_stop() !== 53683) {
    throw new import_core.UniffiInternalError.ApiChecksumMismatch("uniffi_iroh_mobile_bridge_checksum_func_stop");
  }
}
var iroh_mobile_bridge_default = Object.freeze({
  initialize: uniffiEnsureInitialized,
  converters: {
    FfiConverterTypeIrohBridgeError
  }
});
