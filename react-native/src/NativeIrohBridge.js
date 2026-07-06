'use strict';

const { TurboModuleRegistry } = require('react-native');

module.exports =
  TurboModuleRegistry.get('MusicHubIrohBridge') ||
  TurboModuleRegistry.get('IrohBridge');
module.exports.default = module.exports;
