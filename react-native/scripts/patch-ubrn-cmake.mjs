import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cmakePath = resolve(here, '../android/CMakeLists.txt');
const before = `execute_process(
    COMMAND node -p "require.resolve('uniffi-bindgen-react-native/package.json')"
    OUTPUT_VARIABLE UNIFFI_BINDGEN_PATH
    OUTPUT_STRIP_TRAILING_WHITESPACE
)
# Get the directory; get_filename_component and cmake_path will normalize
# paths with Windows path separators.
get_filename_component(UNIFFI_BINDGEN_PATH "\${UNIFFI_BINDGEN_PATH}" DIRECTORY)`;
const after = `execute_process(
    COMMAND node -p "require('path').resolve(require('path').dirname(require.resolve('uniffi-bindgen-react-native')), '../../..')"
    OUTPUT_VARIABLE UNIFFI_BINDGEN_PATH
    OUTPUT_STRIP_TRAILING_WHITESPACE
)`;

const contents = readFileSync(cmakePath, 'utf8');
if (contents.includes(after)) {
  process.exit(0);
}
if (!contents.includes(before)) {
  throw new Error(`Unexpected UBRN CMake format in ${cmakePath}`);
}
writeFileSync(cmakePath, contents.replace(before, after));
