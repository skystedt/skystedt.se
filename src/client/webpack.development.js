const { merge } = require('webpack-merge');
const { common, APP_DIR, BUILD_DIR } = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: BUILD_DIR,
    writeToDisk: true,
	  port: 8080
  }
});