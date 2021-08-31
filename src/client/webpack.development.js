/* eslint-disable no-undef */
const { merge } = require('webpack-merge');
const { common, BUILD_DIR } = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: BUILD_DIR,
    port: 8080,
    proxy: {
      '/api': 'http://localhost:8081'
    }
  }
});
