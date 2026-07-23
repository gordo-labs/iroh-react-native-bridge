import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');
const checkOnly = process.argv.includes('--check');
const generatedFiles = [
  'cpp/generated/iroh_mobile_bridge.cpp',
  'cpp/generated/iroh_mobile_bridge.hpp',
  'src/generated/iroh_mobile_bridge-ffi.ts',
  'src/generated/iroh_mobile_bridge.js',
  'src/generated/iroh_mobile_bridge.ts',
];

const changed = [];
for (const relativePath of generatedFiles) {
  const absolutePath = resolve(packageRoot, relativePath);
  const source = readFileSync(absolutePath, 'utf8');
  const normalized = `${source.replace(/[ \t]+$/gm, '').trimEnd()}\n`;
  if (normalized === source) continue;
  changed.push(relativePath);
  if (!checkOnly) writeFileSync(absolutePath, normalized, 'utf8');
}

if (checkOnly && changed.length > 0) {
  console.error(`Generated files need formatting:\n- ${changed.join('\n- ')}`);
  process.exit(1);
}

console.log(
  changed.length === 0
    ? 'Generated files are formatted.'
    : `Formatted ${changed.length} generated file${changed.length === 1 ? '' : 's'}.`,
);
