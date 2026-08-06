#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildSync } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');
const rustRoot = resolve(packageRoot, '../rust/iroh_mobile_bridge');
const targetRoot = resolve(rustRoot, 'target/release');
const libraryName =
  process.platform === 'darwin'
    ? 'libiroh_mobile_bridge.dylib'
    : process.platform === 'win32'
      ? 'iroh_mobile_bridge.dll'
      : 'libiroh_mobile_bridge.so';
const libraryPath = resolve(targetRoot, libraryName);
const ubrnCli = resolve(
  packageRoot,
  'node_modules/uniffi-bindgen-react-native/bin/cli.cjs',
);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

if (!existsSync(ubrnCli)) {
  throw new Error('uniffi-bindgen-react-native is not installed; run npm ci first');
}

run('cargo', ['build', '--release'], rustRoot);

if (!existsSync(libraryPath)) {
  throw new Error(`Expected host library was not produced: ${libraryPath}`);
}

run(
  process.execPath,
  [
    ubrnCli,
    'generate',
    'jsi',
    'bindings',
    '--library',
    '--ts-dir',
    resolve(packageRoot, 'src/generated'),
    '--cpp-dir',
    resolve(packageRoot, 'cpp/generated'),
    libraryPath,
  ],
  rustRoot,
);

buildSync({
  entryPoints: [resolve(packageRoot, 'src/generated/iroh_mobile_bridge.ts')],
  outfile: resolve(packageRoot, 'src/generated/iroh_mobile_bridge.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['@ubjs/core'],
  logLevel: 'warning',
});
