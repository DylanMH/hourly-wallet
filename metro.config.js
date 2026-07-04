const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve .wasm as an asset for expo-sqlite on web builds.
config.resolver.assetExts.push('wasm');

module.exports = config;
