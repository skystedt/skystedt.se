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
  'polyfills.unfetch': path.resolve(dir.node_modules, 'unfetch', 'polyfill', 'index.js'),
  'polyfills.pixi': path.resolve(dir.node_modules, '@pixi/polyfill'),
  app: { dependOn: ['polyfills.unfetch', 'polyfills.pixi'] }
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
        holder: {
          test: path.resolve(dir.src, 'holder.mjs'),
          priority: 75,
          name: 'holder',
          chunks: 'all'
        },
        game: {
          test: path.resolve(dir.src, 'game'),
          type: wildcardMatch('javascript/*', 'asset/inline'),
          priority: 50,
          name: 'game',
          chunks: 'all'
        },
        insights: {
          test: path.resolve(dir.src, 'insights'),
          type: wildcardMatch('javascript/*'),
          priority: 50,
          name: 'insights',
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
                return 'polyfills.pixi';
              case 'core-js':
              case 'regenerator-runtime':
              case 'unfetch-polyfill':
                return 'polyfills.vendor';
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
