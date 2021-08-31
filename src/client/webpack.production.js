/* eslint-disable no-undef */
const { mergeWithCustomize, unique } = require('webpack-merge');
const { common } = require('./webpack.common.js');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = mergeWithCustomize({
  customizeArray: unique('plugins', [new ESLintPlugin().key], (plugin) => plugin.constructor && plugin.constructor.name)
})(common, {
  mode: 'production',
  plugins: [
    new ESLintPlugin({
      baseConfig: {
        extends: ['plugin:prettier/recommended']
      }
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/i,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  performance: {
    maxAssetSize: 350 * 1024,
    maxEntrypointSize: 350 * 1024
  }
});
