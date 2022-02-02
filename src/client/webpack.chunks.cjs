/* eslint-disable no-undef */
const path = require('path');
const { dir, wildcardMatch } = require('./webpack.helpers.cjs');
/** @typedef { import("webpack").Configuration } Configuration */
/** @typedef { import("webpack").EntryObject } EntryObject */

/** @type {EntryObject} */
const entry = {
  insights: path.resolve(dir.src, 'insights', 'insights.mjs'),
  app: { import: path.resolve(dir.src, 'index.mjs') } // declare as object with import, so it can be extended and merged
};

/** @type {EntryObject} */
const entryLegacy = {
  polyfills: path.resolve(dir.src, 'polyfills.mjs'),
  app: { dependOn: 'polyfills' }
};

/** @type {Configuration} */
const chunks = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          test: dir.src,
          type: wildcardMatch('css/*'),
          priority: 100,
          chunks: 'all',
          name: 'styles'
        },
        insights: {
          test: path.resolve(dir.src, 'insights'),
          type: wildcardMatch('javascript/*'),
          priority: 80,
          name: 'insights',
          chunks: 'all'
        },
        polyfills: {
          test: path.resolve(dir.src, 'polyfills.mjs'),
          type: wildcardMatch('javascript/*'),
          priority: 60,
          name: 'polyfills',
          chunks: 'all'
        },
        game: {
          test: path.resolve(dir.src, 'game'),
          type: wildcardMatch('javascript/*', 'asset/inline'),
          priority: 20,
          name: 'game',
          chunks: 'all'
        },
        vendor: {
          test: dir.node_modules,
          type: wildcardMatch('javascript/*'),
          priority: 10,
          name: (module) => {
            switch (module.resourceResolveData.descriptionFileData.name) {
              case '@pixi/constants':
              case '@pixi/math':
              case '@pixi/runner':
              case '@pixi/settings':
              case '@pixi/ticker':
              case '@pixi/utils':
              case '@pixi/display':
              case '@pixi/core':
              case '@pixi/unsafe-eval':
              case '@pixi/loaders':
              case '@pixi/sprite':
              case '@pixi/app':
              case '@pixi/graphics':
              case 'earcut':
              case 'eventemitter3':
              case 'ismobilejs':
              case 'punycode':
              case 'querystring':
              case 'url':
                return 'pixi';
              case '@pixi/polyfill':
              case 'promise-polyfill':
              case 'object-assign':
                return 'polyfills';
              case 'core-js':
              case 'regenerator-runtime':
                return 'polyfills';
              case 'unfetch-polyfill':
                return 'polyfills';
              case '@microsoft/applicationinsights-web':
              case '@microsoft/applicationinsights-common':
              case '@microsoft/applicationinsights-channel-js':
              case '@microsoft/applicationinsights-properties-js':
              case '@microsoft/applicationinsights-dependencies-js':
              case '@microsoft/applicationinsights-core-js':
              case '@microsoft/applicationinsights-analytics-js':
              case '@microsoft/applicationinsights-shims':
              case '@microsoft/dynamicproto-js':
                return 'insights';
              case 'webpack':
              case 'webpack-dev-server':
              case 'ansi-html-community':
              case 'html-entities':
              case 'events':
              case 'mini-css-extract-plugin':
                return 'development';
              default:
                throw Error(
                  'Unspecified cache group for node_modules package: ' +
                    module.resourceResolveData.descriptionFileData.name
                );
            }
          },
          chunks: 'all'
        }
      }
    }
  }
};

module.exports = {
  entry,
  entryLegacy,
  splitChunks: chunks.optimization.splitChunks
};
