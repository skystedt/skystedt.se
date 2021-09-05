/* eslint-disable no-undef */
const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const dir = {
  src: path.resolve(__dirname, 'src'),
  dist: path.resolve(__dirname, 'dist'),
  node_modules: path.resolve(__dirname, 'node_modules')
};

const config = {
  entry: [path.resolve(dir.node_modules, 'unfetch', 'polyfill'), path.resolve(dir.src, 'index.js')],
  output: {
    filename: '[name].[contenthash].js',
    path: dir.dist,
    assetModuleFilename: 'assets/[name].[contenthash][ext][query]',
    clean: true
  },
  plugins: [
    new ESLintPlugin(), // prettier will be added for production
    new HtmlWebpackPlugin({
      template: path.resolve(dir.src, 'index.html')
    }),
    new CopyPlugin({
      patterns: [path.resolve(dir.src, 'favicon.ico')]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].css'
    })
  ],
  module: {
    rules: [
      {
        test: /\.js/i,
        include: [dir.src],
        exclude: [path.resolve(dir.src, 'game', 'pixi.js')],
        sideEffects: false
      },
      {
        test: /\.js$/i,
        exclude: dir.node_modules,
        use: {
          loader: 'babel-loader'
        }
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
      //minSize: 0,
      cacheGroups: {
        game: {
          test: path.resolve(dir.src, 'game'),
          name: 'game',
          chunks: 'all'
        },
        vendor: {
          test: dir.node_modules,
          name(module) {
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            switch (packageName) {
              case '@pixi':
              case 'earcut':
              case 'eventemitter3':
              case 'ismobilejs':
              case 'punycode':
              case 'querystring':
              case 'url':
                return 'pixi';
              case 'core-js':
              case 'regenerator-runtime':
              case 'unfetch':
              case 'promise-polyfill':
              case 'object-assign':
                return 'polyfills';
              default:
                return 'vendors';
            }
          },
          chunks: 'all'
        }
      }
    },
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
    removeAvailableModules: true,
    sideEffects: true
  }
};

module.exports = {
  dir,
  common: config
};
