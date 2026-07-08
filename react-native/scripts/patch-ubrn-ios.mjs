import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const headerPath = resolve(here, '../ios/IrohBridge.h');
const podspecPath = resolve(here, '../IrohBridge.podspec');

const before = `#ifdef RCT_NEW_ARCH_ENABLED
#import "RNNativeModuleSpec.h"

@interface IrohBridge : NSObject <NativeIrohBridgeSpec>
#else
#import <React/RCTBridgeModule.h>

@interface IrohBridge : NSObject <RCTBridgeModule>
#endif`;
const after = `#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <ReactCommon/RCTTurboModule.h>

@interface IrohBridge : NSObject <RCTBridgeModule, RCTTurboModule>
#else
@interface IrohBridge : NSObject <RCTBridgeModule>
#endif`;

const contents = readFileSync(headerPath, 'utf8');
if (contents.includes(after)) {
  process.exit(0);
}
if (!contents.includes(before)) {
  throw new Error(`Unexpected UBRN iOS header format in ${headerPath}`);
}
writeFileSync(headerPath, contents.replace(before, after));

const frameworkName = 'ReactNativeIrohBridgeFramework.xcframework';

const podspecBefore = `  s.vendored_frameworks = "${frameworkName}"
  s.dependency    "uniffi-bindgen-react-native", "0.31.0-3"`;
const podspecAfter = `  s.vendored_frameworks = "${frameworkName}"
  s.dependency    "uniffi-bindgen-react-native", "0.31.0-3"
  s.pod_target_xcconfig = {
    "EXCLUDED_ARCHS[sdk=iphonesimulator*]" => "x86_64"
  }
  s.user_target_xcconfig = {
    "EXCLUDED_ARCHS[sdk=iphonesimulator*]" => "x86_64"
  }`;
let podspec = readFileSync(podspecPath, 'utf8');
if (!podspec.includes('s.user_target_xcconfig')) {
  if (!podspec.includes(podspecBefore)) {
    throw new Error(`Unexpected UBRN podspec format in ${podspecPath}`);
  }
  podspec = podspec.replace(podspecBefore, podspecAfter);
}
podspec = podspec.replace(
  `      s.pod_target_xcconfig    = {
          "HEADER_SEARCH_PATHS" => "\\"$(PODS_ROOT)/boost\\""`,
  `      s.pod_target_xcconfig    = {
          "EXCLUDED_ARCHS[sdk=iphonesimulator*]" => "x86_64",
          "HEADER_SEARCH_PATHS" => "\\"$(PODS_ROOT)/boost\\""`
);
writeFileSync(podspecPath, podspec);
