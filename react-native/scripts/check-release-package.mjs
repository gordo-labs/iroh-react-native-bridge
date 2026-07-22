import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

if (failures.length > 0) {
  console.error(`Release package validation failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(
  `Release package validated: v${packageJson.version}, ${requiredFiles.length} required files, ${(nativeBytes / 1024 / 1024).toFixed(1)} MiB native payload.`,
);
