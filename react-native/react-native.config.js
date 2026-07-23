module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import design.gordo.iroh.reactnative.IrohBridgePackage;',
        packageInstance: 'new IrohBridgePackage()',
      },
      ios: {
        podspecPath: './IrohBridge.podspec',
      },
    },
  },
};
