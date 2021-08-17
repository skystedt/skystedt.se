const { merge } = require('webpack-merge');
const { common, APP_DIR, BUILD_DIR } = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: "defaults" }]
            ]
          }
        }
      }
    ]
  },
  performance: {
    maxAssetSize: 300000,
    maxEntrypointSize: 300000
  }
});