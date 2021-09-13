/* eslint-disable no-undef */
const { merge } = require('webpack-merge');
const { common, dir } = require('./webpack.common.cjs');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: dir.dist,
    port: 8080,
    proxy: {
      '/api': 'http://localhost:8081'
    }
  },
  optimization: {
    minimize: false
  }
});