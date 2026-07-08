import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const generatedJsPath = resolve(here, '../src/generated/iroh_mobile_bridge.js');

let contents = readFileSync(generatedJsPath, 'utf8');

const replacements = [
  [
    `function connect(nodeId2, relayUrl) {
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
        FfiConverterOptionalString.lower(relayUrl, iroh_mobile_bridge_ffi_default().rustbuffer_alloc),
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  ));
}`,
    `function connect(nodeId2, alpn, addressHint, timeoutMs) {
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
}`,
  ],
  [
    `function start() {
  uniffiCaller.rustCallWithError(
    /*liftError:*/
    FfiConverterTypeIrohBridgeError.lift.bind(FfiConverterTypeIrohBridgeError),
    /*caller:*/
    (callStatus) => {
      iroh_mobile_bridge_ffi_default().ubrn_uniffi_iroh_mobile_bridge_fn_func_start(
        callStatus
      );
    },
    /*liftString:*/
    FfiConverterString.lift.bind(FfiConverterString)
  );
}`,
    `function start(alpns) {
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
}`,
  ],
  [
    `var FfiConverterOptionalString = new import_core.FfiConverterOptional(FfiConverterString);
var FfiConverterOptionalBytes = new import_core.FfiConverterOptional(import_core.FfiConverterArrayBuffer);`,
    `var FfiConverterOptionalString = new import_core.FfiConverterOptional(FfiConverterString);
var FfiConverterOptionalUInt32 = new import_core.FfiConverterOptional(import_core.FfiConverterUInt32);
var FfiConverterOptionalBytes = new import_core.FfiConverterOptional(import_core.FfiConverterArrayBuffer);
var FfiConverterSequenceString = new import_core.FfiConverterArray(FfiConverterString);
var FfiConverterOptionalSequenceString = new import_core.FfiConverterOptional(FfiConverterSequenceString);`,
  ],
  [
    `ubrn_uniffi_iroh_mobile_bridge_checksum_func_connect() !== 61461`,
    `ubrn_uniffi_iroh_mobile_bridge_checksum_func_connect() !== 8623`,
  ],
  [
    `ubrn_uniffi_iroh_mobile_bridge_checksum_func_start() !== 32052`,
    `ubrn_uniffi_iroh_mobile_bridge_checksum_func_start() !== 42673`,
  ],
];

for (const [before, after] of replacements) {
  if (contents.includes(after)) {
    continue;
  }
  if (!contents.includes(before)) {
    throw new Error(`Unexpected generated JS format in ${generatedJsPath}`);
  }
  contents = contents.replace(before, after);
}

writeFileSync(generatedJsPath, contents);
