'use strict';

const { TurboModuleRegistry } = require('react-native');

module.exports = TurboModuleRegistry.getEnforcing('IrohBridge');
module.exports.default = module.exports;
