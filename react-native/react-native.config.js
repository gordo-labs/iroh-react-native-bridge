module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import design.gordo.musichub.iroh.IrohBridgePackage;',
        packageInstance: 'new IrohBridgePackage()',
      },
      ios: {
        podspecPath: './IrohBridge.podspec',
      },
    },
  },
};
