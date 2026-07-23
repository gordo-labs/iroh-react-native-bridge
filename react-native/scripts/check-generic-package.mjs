import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const bannedPatterns = [
  new RegExp('Music' + 'Hub', 'i'),
  new RegExp('Music' + ' ' + 'Hub', 'i'),
  new RegExp('music' + '-' + 'hub', 'i'),
  new RegExp('music' + 'hub', 'i'),
  new RegExp('Sover' + 'eign'),
  new RegExp('session' + '\\.' + 'verify'),
  new RegExp('play' + 'back', 'i'),
  new RegExp('iroh' + '-' + 'http' + '\\/' + '2' + '-' + 'duplex'),
];

const files = execFileSync(
  'find',
  [
    root,
    '-type',
    'f',
    '!',
    '-path',
    `${root}/node_modules/*`,
    '!',
    '-path',
    `${root}/android/.cxx/*`,
    '!',
    '-path',
    `${root}/android/build/*`,
    '!',
    '-path',
    `${root}/android/src/main/jniLibs/*`,
    '!',
    '-path',
    `${root}/ReactNativeIrohBridgeFramework.xcframework/*`,
  ],
  { encoding: 'utf8' },
)
  .split('\n')
  .filter(Boolean);

const violations = [];
for (const file of files) {
  const contents = readFileSync(file, 'utf8');
  for (const pattern of bannedPatterns) {
    if (pattern.test(contents)) {
      violations.push(`${relative(root, file)} matches ${pattern}`);
    }
  }
}

if (violations.length) {
  throw new Error(`Generic package scope check failed:\n${violations.join('\n')}`);
}
