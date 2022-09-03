/* eslint-env node */
const webpack = require('webpack');
const update = require('immutability-helper');
const CspHtmlWebpackPlugin = require('csp-html-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const StylelintPlugin = require('stylelint-webpack-plugin');
const { dir } = require('./webpack.helpers.cjs');
const { browserslistEnvironment, mergeCspPlugin } = require('./webpack.helpers.cjs');
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
  output: {
    module: false // HMR is not implemented for module chunk format yet
  },
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
    new CspHtmlWebpackPlugin(
      {},
      {
        processFn: (builtPolicy, htmlPluginData, $) => {
          // modify CSP for local development
          builtPolicy = builtPolicy
            .replace('webpack', "webpack 'allow-duplicates' webpack-dev-server#overlay")
            .replace('; report-uri /api/csp/report', '')
            .replace('; report-to csp-report', '');
          // call default processFn to add <meta> tag
          new CspHtmlWebpackPlugin().opts.processFn(builtPolicy, htmlPluginData, $);
        }
      }
    ),
    new ESLintPlugin({
      extensions: '.mjs',
      failOnError: false,
      failOnWarning: false,
      overrideConfig: {
        rules: {
          'compat/compat': ['warn', browserslistEnvironment('all').config]
        }
      }
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
    output: { $merge: configuration.output },
    devServer: { $set: configuration.devServer },
    plugins: {
      $apply: (plugins) => {
        mergeCspPlugin(plugins, configuration.plugins);
        plugins = [...(plugins || []), ...(configuration.plugins || [])];
        return plugins;
      }
    }
  };
};

const legacy = update(sharedLegacy, rules(development));
const modern = update(update(sharedModern, rules(development)), rulesModern(developmentModern));

module.exports = [legacy, modern];
