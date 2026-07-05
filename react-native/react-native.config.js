module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import design.gordo.musichub.iroh.MusicHubIrohPackage;',
        packageInstance: 'new MusicHubIrohPackage()',
      },
      ios: {
        podspecPath: './MusicHubIrohBridge.podspec',
      },
    },
  },
};
