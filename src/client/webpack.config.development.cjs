/* eslint-env node */
const webpack = require('webpack');
const update = require('immutability-helper');
const ESLintPlugin = require('eslint-webpack-plugin');
const StylelintPlugin = require('stylelint-webpack-plugin');
const { dir } = require('./webpack.helpers.cjs');
const { sharedLegacy, sharedModern } = require('./webpack.config.shared.cjs');
/** @typedef { import("webpack").Configuration } Configuration */

/** @type {Configuration} */
const development = {
  mode: 'development',
  devtool: 'inline-source-map',
  plugins: [
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: '"1ef798fd-96b6-4e8b-a8c0-ea41a23d05b8"'
    })
  ],
  optimization: {
    minimize: false
  }
};

/** @type {Configuration} */
const developmentModern = {
  devServer: {
    static: {
      directory: dir.dist
    },
    server: 'https',
    port: 8080,
    proxy: {
      '/api': 'http://127.0.0.1:8081'
    }
  },
  plugins: [
    new ESLintPlugin({
      extensions: '.mjs',
      failOnError: false,
      failOnWarning: false
    }),
    new StylelintPlugin({
      extensions: '.css',
      failOnError: false,
      failOnWarning: false
    })
  ]
};

const rules = (configuration) => {
  return {
    mode: { $set: configuration.mode },
    devtool: { $set: configuration.devtool },
    plugins: { $push: configuration.plugins },
    optimization: { $merge: configuration.optimization }
  };
};

const rulesModern = (configuration) => {
  return {
    devServer: { $set: configuration.devServer },
    plugins: { $push: configuration.plugins }
  };
};

const legacy = update(sharedLegacy, rules(development));
const modern = update(update(sharedModern, rules(development)), rulesModern(developmentModern));

module.exports = [legacy, modern];
