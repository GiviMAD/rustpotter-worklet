const path = require('path');
const TypescriptDeclarationPlugin = require('typescript-declaration-webpack-plugin');
/** @type {import('webpack').Configuration} */
module.exports = {
  mode: "production",
  experiments: {
    "asyncWebAssembly": true
  },
  entry: {
    index: './src/rustpotterService.ts',
    rustpotterWorklet: './src/rustpotterWorklet.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
        }
      }
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new TypescriptDeclarationPlugin({}),
  ],
  output: {
    globalObject: 'typeof self !== \'undefined\' ? self : this',
    libraryTarget: 'umd2',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '',
    assetModuleFilename: "[name][ext]",
    wasmLoading: false,
    chunkLoading: false
  },
};