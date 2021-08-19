const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const APP_DIR = path.resolve(__dirname, 'src');
const BUILD_DIR = path.resolve(__dirname, 'dist');

const config = {
  entry: path.resolve(APP_DIR, 'index.js'),
  output: {
    filename: '[name].[contenthash].js',
    path: BUILD_DIR,
    assetModuleFilename: 'assets/[name].[contenthash][ext][query]',
    clean: true
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(APP_DIR, 'index.html')
    }),
    new CopyPlugin({
      patterns: [
        path.resolve(APP_DIR, 'favicon.ico')
      ]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].css',
    })
  ],
  module: {
    rules: [
      {
        test: /\.js/i,
        exclude: [
          path.resolve(APP_DIR, 'game', 'pixi.js')
        ],
        sideEffects: false
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/inline'
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    },
    minimizer: [
      new TerserPlugin(),
      new CssMinimizerPlugin()
    ]
  }
};

module.exports = {
  APP_DIR: APP_DIR,
  BUILD_DIR: BUILD_DIR,
  common: config
};