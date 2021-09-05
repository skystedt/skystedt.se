/* eslint-disable no-undef */
const { mergeWithCustomize, unique } = require('webpack-merge');
const { common } = require('./webpack.common.cjs');
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
  optimization: {
    minimize: true
  },
  performance: {
    maxAssetSize: 300 * 1024,
    maxEntrypointSize: 400 * 1024
  }
});
