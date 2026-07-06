module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import design.gordo.musichub.iroh.MusicHubIrohBridgePackage;',
        packageInstance: 'new MusicHubIrohBridgePackage()',
      },
      ios: {
        podspecPath: './IrohBridge.podspec',
      },
    },
  },
};
