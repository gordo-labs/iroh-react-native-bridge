'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

test('extracts UniFFI symbols and reports a stale iOS library', async () => {
  const { extractUniffiSymbols, missingUniffiSymbols, parseNmDefinedSymbols } = await import(
    '../scripts/check-native-abi.mjs'
  );
  const cpp = `
    RustBuffer uniffi_iroh_mobile_bridge_fn_func_connect();
    RustBuffer uniffi_iroh_mobile_bridge_fn_func_connect_target();
    uint16_t uniffi_iroh_mobile_bridge_checksum_func_connect_target();
  `;
  const expected = extractUniffiSymbols(cpp);
  assert.deepEqual(expected, [
    'uniffi_iroh_mobile_bridge_checksum_func_connect_target',
    'uniffi_iroh_mobile_bridge_fn_func_connect',
    'uniffi_iroh_mobile_bridge_fn_func_connect_target',
  ]);
  const defined = parseNmDefinedSymbols(
    '0000000000008f7c T _uniffi_iroh_mobile_bridge_fn_func_connect\n',
  );
  assert.deepEqual(missingUniffiSymbols(expected, defined), [
    'uniffi_iroh_mobile_bridge_checksum_func_connect_target',
    'uniffi_iroh_mobile_bridge_fn_func_connect_target',
  ]);
});
