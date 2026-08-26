#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const UNIFFI_SYMBOL_RE =
  /\buniffi_iroh_mobile_bridge_(?:fn|checksum)_func_[A-Za-z0-9_]+\b/g;
const GENERATED_CPP_REL = 'cpp/generated/iroh_mobile_bridge.cpp';
const IOS_DEVICE_LIB_REL =
  'ReactNativeIrohBridgeFramework.xcframework/ios-arm64/libiroh_mobile_bridge.a';
const ANDROID_LIB_RELS = [
  'android/src/main/jniLibs/arm64-v8a/libiroh_mobile_bridge.so',
  'android/src/main/jniLibs/armeabi-v7a/libiroh_mobile_bridge.so',
  'android/src/main/jniLibs/x86/libiroh_mobile_bridge.so',
  'android/src/main/jniLibs/x86_64/libiroh_mobile_bridge.so',
];

export function extractUniffiSymbols(cppSource) {
  return [...new Set(String(cppSource).match(UNIFFI_SYMBOL_RE) || [])].sort();
}

export function parseNmDefinedSymbols(nmOutput) {
  const symbols = new Set();
  for (const line of String(nmOutput).split('\n')) {
    const match = line.match(/\s[TDS]\s+_?(uniffi_iroh_mobile_bridge_[A-Za-z0-9_]+)\s*$/);
    if (match) symbols.add(match[1]);
  }
  return symbols;
}

export function missingUniffiSymbols(expected, defined) {
  const definedSet = defined instanceof Set ? defined : new Set(defined);
  return expected.filter((symbol) => !definedSet.has(symbol));
}

export function checkIosNativeAbi(packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  return checkLibraryAbi(
    packageRoot,
    IOS_DEVICE_LIB_REL,
    'iOS device library',
  );
}

export function checkAndroidNativeAbi(packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  for (const rel of ANDROID_LIB_RELS) {
    const result = checkLibraryAbi(packageRoot, rel, `Android library ${rel}`);
    if (!result.ok) return result;
  }
  const expected = extractUniffiSymbols(
    readFileSync(resolve(packageRoot, GENERATED_CPP_REL), 'utf8'),
  );
  return { ok: true, expected };
}

function checkLibraryAbi(packageRoot, libRel, label) {
  const cppPath = resolve(packageRoot, GENERATED_CPP_REL);
  const libPath = resolve(packageRoot, libRel);
  if (!existsSync(cppPath)) {
    return { ok: false, error: `Generated C++ bindings are missing: ${cppPath}` };
  }
  if (!existsSync(libPath)) {
    return { ok: false, error: `${label} is missing: ${libPath}` };
  }

  const expected = extractUniffiSymbols(readFileSync(cppPath, 'utf8'));
  const buf = readFileSync(libPath);
  const defined = new Set(
    expected.filter(
      (symbol) =>
        buf.includes(Buffer.from(symbol, 'ascii')) ||
        buf.includes(Buffer.from(`_${symbol}`, 'ascii')),
    ),
  );
  const missing = missingUniffiSymbols(expected, defined);
  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      error: `${label} is stale; missing UniFFI symbols: ${missing.join(', ')}`,
    };
  }
  return { ok: true, expected };
}

const invokedDirectly =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const ios = checkIosNativeAbi();
  if (!ios.ok) {
    console.error(ios.error);
    process.exit(1);
  }
  const android = checkAndroidNativeAbi();
  if (!android.ok) {
    console.error(android.error);
    process.exit(1);
  }
  console.log(
    `Native iOS and Android ABI match generated C++ (${ios.expected.length} UniFFI symbols).`,
  );
}
