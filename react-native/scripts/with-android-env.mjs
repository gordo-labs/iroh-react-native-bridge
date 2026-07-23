#!/usr/bin/env node
/** @deprecated Prefer with-native-build-env.mjs --android */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const next = resolve(here, 'with-native-build-env.mjs');
const result = spawnSync(process.execPath, [next, '--android', ...process.argv.slice(2)], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
