import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryFiles = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  {
    cwd: repositoryRoot,
    encoding: 'utf8',
  },
).split('\0').filter(Boolean);

const forbiddenNames = [
  /(?:^|\/)\.DS_Store$/,
  /(?:^|\/)\.env(?:\.|$)/,
  /\.tgz$/,
  /(?:^|\/)target\//,
  /(?:^|\/)node_modules\//,
];
const textExtensions = new Set([
  '', '.c', '.cpp', '.gradle', '.h', '.hpp', '.java', '.js', '.json', '.kt',
  '.md', '.mjs', '.mm', '.plist', '.podspec', '.rs', '.toml', '.ts', '.xml',
  '.yaml', '.yml',
]);
const secretPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ['npm token', /\bnpm_[A-Za-z0-9]{30,}\b/],
  ['npm auth token', /:_authToken\s*=\s*(?!\$\{|<)[^\s]+/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
];

const failures = [];
for (const relativePath of repositoryFiles) {
  if (forbiddenNames.some((pattern) => pattern.test(relativePath))) {
    failures.push(`${relativePath}: generated/private file must not be tracked`);
    continue;
  }
  if (!textExtensions.has(extname(relativePath))) continue;
  const contents = readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(contents)) failures.push(`${relativePath}: possible ${label}`);
  }
}

if (failures.length > 0) {
  console.error(`Repository safety check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Repository safety check passed (${repositoryFiles.length} source files).`);
