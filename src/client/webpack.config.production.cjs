/* eslint-env node */
const webpack = require('webpack');
const minimatch = require('minimatch');
const update = require('immutability-helper');
const ESLintPlugin = require('eslint-webpack-plugin');
const StylelintPlugin = require('stylelint-webpack-plugin');
const { browserslistEnvironment } = require('./webpack.helpers.cjs');
const { sharedLegacy, sharedModern } = require('./webpack.config.shared.cjs');
/** @typedef { import("webpack").Configuration } Configuration */

/** @type {Configuration} */
const production = {
  mode: 'production',
  plugins: [
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: '"efd49a11-d1f6-4907-a112-40e07bcd7f56"'
    })
  ],
  optimization: {
    minimize: true
  },
  performance: {
    assetFilter: (assetFilename) => {
      if (minimatch(assetFilename, 'pixi.*.*js')) {
        return false;
      }
      return true;
    }
  }
};

/** @type {Configuration} */
const productionModern = {
  output: {
    module: true
  },
  plugins: [
    new ESLintPlugin({
      extensions: '.mjs',
      failOnError: true,
      failOnWarning: true,
      overrideConfig: {
        rules: {
          'compat/compat': ['warn', browserslistEnvironment('all').config]
        }
      },
      baseConfig: {
        // customize eslint by enforcing prettier (make sure prettier has been used)
        // only for production so to not disrupt development, https://prettier.io/docs/en/integrating-with-linters.html
        // should be last, https://github.com/prettier/eslint-plugin-prettier#recommended-configuration
        extends: ['plugin:prettier/recommended']
      }
    }),
    new StylelintPlugin({
      extensions: '.css',
      failOnError: true,
      failOnWarning: true
    })
  ]
};

const rules = (configuration) => {
  return {
    mode: { $set: configuration.mode },
    plugins: { $push: configuration.plugins },
    optimization: { $merge: configuration.optimization },
    performance: { $set: configuration.performance }
  };
};

const rulesModern = (configuration) => {
  return {
    output: { $merge: configuration.output },
    plugins: { $push: configuration.plugins }
  };
};

const legacy = update(sharedLegacy, rules(production));
const modern = update(update(sharedModern, rules(production)), rulesModern(productionModern));

module.exports = [legacy, modern];
