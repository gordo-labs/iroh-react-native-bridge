import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAndroidNativeAbi, checkIosNativeAbi } from './check-native-abi.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');
const repositoryRoot = resolve(packageRoot, '..');
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
const cargoManifest = readFileSync(
  resolve(repositoryRoot, 'rust/iroh_mobile_bridge/Cargo.toml'),
  'utf8',
);
const cargoVersion = cargoManifest.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

const failures = [];

if (packageJson.name !== '@gordo-labs/react-native-iroh') {
  failures.push(`Unexpected npm package name: ${packageJson.name ?? '(missing)'}`);
}

if (packageJson.private === true) {
  failures.push('The npm package must not be private');
}

if (!packageJson.engines?.node || !packageJson.engines.node.includes('22')) {
  failures.push('engines.node must explicitly support Node.js 22 or newer');
}

// A published package must be self-contained. Local/workspace specs are valid
// in an app monorepo, but npm cannot resolve them from the public registry.
for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const [name, spec] of Object.entries(packageJson[section] ?? {})) {
    if (/^(?:file|workspace|link):/.test(String(spec))) {
      failures.push(`Non-publishable ${section} entry ${name}: ${spec}`);
    }
  }
}

if (!cargoVersion || cargoVersion !== packageJson.version) {
  failures.push(
    `Version mismatch: npm=${packageJson.version ?? '(missing)'}, Cargo=${cargoVersion ?? '(missing)'}`,
  );
}

if (packageJson.publishConfig?.access !== 'public') {
  failures.push('publishConfig.access must be "public" for the scoped npm package');
}

if (packageJson.publishConfig?.provenance !== true) {
  failures.push('publishConfig.provenance must be true');
}

const requiredFiles = [
  ['React Native entry point', 'src/index.js', 1],
  ['TypeScript declarations', 'src/index.d.ts', 1],
  ['Package license', 'LICENSE', 1],
  ['Podspec', 'IrohBridge.podspec', 1],
  ['Modern Android manifest', 'android/src/main/AndroidManifestNew.xml', 1],
  ['iOS XCFramework metadata', 'ReactNativeIrohBridgeFramework.xcframework/Info.plist', 1],
  ['iOS device static library', 'ReactNativeIrohBridgeFramework.xcframework/ios-arm64/libiroh_mobile_bridge.a', 1_000_000],
  ['iOS simulator static library', 'ReactNativeIrohBridgeFramework.xcframework/ios-arm64-simulator/libiroh_mobile_bridge.a', 1_000_000],
  ['Android arm64 library', 'android/src/main/jniLibs/arm64-v8a/libiroh_mobile_bridge.so', 1_000_000],
  ['Android armv7 library', 'android/src/main/jniLibs/armeabi-v7a/libiroh_mobile_bridge.so', 1_000_000],
  ['Android x86 library', 'android/src/main/jniLibs/x86/libiroh_mobile_bridge.so', 1_000_000],
  ['Android x86_64 library', 'android/src/main/jniLibs/x86_64/libiroh_mobile_bridge.so', 1_000_000],
];

let nativeBytes = 0;
for (const [label, relativePath, minimumBytes] of requiredFiles) {
  const absolutePath = resolve(packageRoot, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${label} is missing: ${relativePath}`);
    continue;
  }
  const size = statSync(absolutePath).size;
  if (size < minimumBytes) {
    failures.push(`${label} is unexpectedly small (${size} bytes): ${relativePath}`);
  }
  if (/\.(?:a|so)$/.test(relativePath)) nativeBytes += size;
}

// Validate the actual npm packlist as well as the source tree. This catches a
// future `files` glob change that silently leaves a native slice out of the
// tarball even though it exists locally.
try {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const packed = JSON.parse(
    execFileSync(npmCommand, ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
  const packFiles = new Set((packed.at(-1)?.files ?? []).map(({ path }) => path));
  for (const [, relativePath] of requiredFiles) {
    if (existsSync(resolve(packageRoot, relativePath)) && !packFiles.has(relativePath)) {
      failures.push(`Required file is not included in npm tarball: ${relativePath}`);
    }
  }
} catch (error) {
  failures.push(`Unable to inspect npm packlist: ${error.message}`);
}

const iosAbi = checkIosNativeAbi(packageRoot);
if (!iosAbi.ok) {
  failures.push(iosAbi.error);
}
const androidAbi = checkAndroidNativeAbi(packageRoot);
if (!androidAbi.ok) {
  failures.push(androidAbi.error);
}

if (failures.length > 0) {
  console.error(`Release package validation failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(
  `Release package validated: v${packageJson.version}, ${requiredFiles.length} required files, ${(nativeBytes / 1024 / 1024).toFixed(1)} MiB native payload.`,
);
