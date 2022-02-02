/* eslint-disable no-undef */
const path = require('path');
const update = require('immutability-helper');
const structuredClone = require('core-js/stable/structured-clone.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CreateFileWebpack = require('create-file-webpack');
const { entry, entryLegacy, splitChunks } = require('./webpack.chunks.cjs');
const { dir, browsers, ScriptsHtmlWebpackPlugin, mergeBabelRules, mergeCssRules } = require('./webpack.helpers.cjs');
/** @typedef { import("webpack").Configuration } Configuration */
/** @typedef { import("@babel/preset-env").Options } BabelOptions */

// print the browsers so it's possible to compare browsers between builds without having the dist
console.log('browsers', browsers);

/** @returns {Configuration} */
const shared = {
  entry: entry,
  plugins: [], // needs an array for merging
  module: {
    rules: [
      {
        test: /\.m?js$/i,
        include: dir.src,
        exclude: [path.resolve(dir.src, 'polyfills.mjs'), path.resolve(dir.src, 'game', 'pixi.mjs')],
        sideEffects: false
      },
      {
        test: /\.m?js$/i,
        include: dir.src,
        use: {
          loader: 'babel-loader',
          options: require('./babel.config.json')
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
    runtimeChunk: false,
    splitChunks: {
      minSize: 0,
      minSizeReduction: 0,
      cacheGroups: splitChunks.cacheGroups
    },
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
    removeAvailableModules: true,
    sideEffects: true
  }
};

/** @type {Configuration} */
const modern = {
  name: 'modern',
  dependencies: ['legacy'], // so clean can run correctly
  target: 'browserslist:modern',
  output: {
    filename: '[name].[contenthash].mjs',
    path: dir.dist,
    publicPath: '/',
    clean: {
      keep: 'legacy'
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(dir.src, 'index.html'),
      scriptLoading: 'module'
    }),
    new ScriptsHtmlWebpackPlugin({
      add: [
        { path: 'legacy/insights.*.js', directory: dir.dist },
        { path: 'legacy/polyfills.*.js', directory: dir.dist },
        { path: 'legacy/app.*.js', directory: dir.dist }
      ],
      attributes: [
        { path: '**/insights.*.*js', async: true },
        { path: 'legacy/*.js', type: 'nomodule', defer: true }
      ]
    }),
    new CopyPlugin({
      patterns: [path.resolve(dir.src, 'favicon.ico')]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    new CreateFileWebpack({
      path: dir.dist,
      fileName: 'browsers.json',
      content: JSON.stringify(browsers, null, 2)
    })
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/i,
        use: {
          loader: 'babel-loader',
          options: /** @type {BabelOptions} */ ({
            browserslistEnv: 'modern',
            exclude: [
              'web.dom-collections.iterator', // added when using any for-of, but is not needed if not useing for-of on DOM collections, https://github.com/zloirock/core-js/issues/1003
              'es.string.replace' // added when using string.replace, to standardize, but is not needed, https://github.com/zloirock/core-js/issues/817
            ]
          })
        }
      }
    ]
  }
};

/** @type {Configuration} */
const legacy = {
  name: 'legacy',
  target: 'browserslist:legacy',
  entry: entryLegacy,
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(dir.dist, 'legacy'),
    publicPath: '/legacy/',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.m?js$/i,
        use: {
          loader: 'babel-loader',
          options: /** @type {BabelOptions} */ ({
            browserslistEnv: 'legacy'
          })
        }
      },
      {
        test: /\.css$/i,
        use: 'ignore-loader'
      }
    ]
  }
};

const rules = (configuration) => {
  return {
    name: { $set: configuration.name },
    dependencies: { $set: configuration.dependencies },
    target: { $set: configuration.target },
    entry: { $merge: configuration.entry || {}, app: { $merge: configuration.entry?.app || {} } },
    output: { $set: configuration.output },
    plugins: { $push: configuration.plugins || [] },
    module: {
      rules: {
        $apply: (rules) => {
          const updatedRules = structuredClone(rules); // needed because we require babel.config.json
          mergeBabelRules(updatedRules, configuration.module.rules);
          mergeCssRules(updatedRules, configuration.module.rules);
          return updatedRules;
        }
      }
    }
  };
};

const sharedLegacy = update(shared, rules(legacy));
const sharedModern = update(shared, rules(modern));

module.exports = { sharedLegacy, sharedModern };
