#!/usr/bin/env node
/**
 * Force rustup cargo/rustc (not Homebrew) for native cross-builds.
 * With --android, also resolve ANDROID_HOME / ANDROID_NDK_HOME.
 */
import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const rawArgs = process.argv.slice(2);
const requireAndroid = rawArgs[0] === '--android';
const args = requireAndroid ? rawArgs.slice(1) : rawArgs;

if (args.length === 0) {
  console.error('usage: with-native-build-env.mjs [--android] <command> [args...]');
  process.exit(2);
}

function firstExisting(paths) {
  for (const path of paths) {
    if (path && existsSync(path)) return path;
  }
  return null;
}

function runCapture(command, commandArgs, env = process.env) {
  const result = spawnSync(command, commandArgs, {
    encoding: 'utf8',
    env,
  });
  if (result.status !== 0) return null;
  return (result.stdout || '').trim() || null;
}

function resolveRustupToolchainBin() {
  const rustcPath = runCapture('rustup', ['which', 'rustc']);
  if (!rustcPath || !existsSync(rustcPath)) return null;
  const binDir = dirname(rustcPath);
  if (!existsSync(join(binDir, 'cargo'))) return null;
  return binDir;
}

function sysrootHasTarget(rustcPath, target) {
  const sysroot = runCapture(rustcPath, ['--print', 'sysroot']);
  if (!sysroot) return false;
  return existsSync(join(sysroot, 'lib', 'rustlib', target));
}

function resolveAndroidHome() {
  const fromEnv = firstExisting([
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
  ]);
  if (fromEnv) return fromEnv;

  return firstExisting([
    '/opt/homebrew/share/android-commandlinetools',
    '/usr/local/share/android-commandlinetools',
    join(homedir(), 'Library/Android/sdk'),
    join(homedir(), 'Android/Sdk'),
  ]);
}

function resolveNdkHome(androidHome) {
  const fromEnv = firstExisting([process.env.ANDROID_NDK_HOME]);
  if (fromEnv) return fromEnv;

  if (!androidHome) return null;
  const ndkRoot = join(androidHome, 'ndk');
  if (!existsSync(ndkRoot)) {
    return firstExisting([join(androidHome, 'ndk-bundle')]);
  }

  const versions = readdirSync(ndkRoot)
    .filter((name) => existsSync(join(ndkRoot, name, 'source.properties')))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return versions.length > 0 ? join(ndkRoot, versions[0]) : null;
}

const rustupBin = resolveRustupToolchainBin();
if (!rustupBin) {
  console.error(
    [
      'rustup toolchain not found (needed for iOS/Android Rust targets).',
      'Install rustup and a stable toolchain, then add targets:',
      '  rustup target add aarch64-apple-ios aarch64-apple-ios-sim aarch64-linux-android',
      '',
      'Note: Homebrew rust cannot cross-compile to iOS/Android.',
    ].join('\n'),
  );
  process.exit(1);
}

const rustupRustc = join(rustupBin, 'rustc');
const requiredTargets = requireAndroid
  ? ['aarch64-linux-android']
  : ['aarch64-apple-ios'];
const missingTargets = requiredTargets.filter(
  (target) => !sysrootHasTarget(rustupRustc, target),
);
if (missingTargets.length > 0) {
  console.error(
    [
      `Active rustup toolchain is missing target(s): ${missingTargets.join(', ')}`,
      `Run: rustup target add ${missingTargets.join(' ')}`,
    ].join('\n'),
  );
  process.exit(1);
}

const cargoHomeBin = join(homedir(), '.cargo', 'bin');
const pathParts = [
  rustupBin,
  existsSync(cargoHomeBin) ? cargoHomeBin : null,
  process.env.PATH || '',
].filter(Boolean);

const env = {
  ...process.env,
  PATH: pathParts.join(':'),
  CARGO: join(rustupBin, 'cargo'),
  RUSTC: rustupRustc,
};

if (requireAndroid) {
  const androidHome = resolveAndroidHome();
  const ndkHome = resolveNdkHome(androidHome);
  if (!androidHome || !ndkHome) {
    console.error(
      [
        'Could not find Android SDK/NDK for cargo-ndk.',
        'Install NDK (sdkmanager "ndk;27.1.12297006") or set:',
        '  export ANDROID_HOME=/path/to/sdk',
        '  export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/<version>',
        '',
        `Detected ANDROID_HOME: ${androidHome ?? '(none)'}`,
        `Detected ANDROID_NDK_HOME: ${ndkHome ?? '(none)'}`,
      ].join('\n'),
    );
    process.exit(1);
  }
  env.ANDROID_HOME = androidHome;
  env.ANDROID_SDK_ROOT = process.env.ANDROID_SDK_ROOT || androidHome;
  env.ANDROID_NDK_HOME = ndkHome;
}

const [command, ...commandArgs] = args;
const result = spawnSync(command, commandArgs, {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
