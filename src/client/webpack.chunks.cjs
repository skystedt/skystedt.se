/* eslint-env node */
const path = require('path');
const minimatch = require('minimatch');
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
          test: (module) =>
            module.resource &&
            minimatch(module.resource, path.resolve(dir.node_modules, '**'), { windowsPathsNoEscape: true }) &&
            // when using output = module then node modules only used with local dev server will break local development if included in cacheGroups
            ![
              'webpack',
              'webpack-dev-server',
              'ansi-html-community',
              'html-entities',
              'events',
              'mini-css-extract-plugin'
            ].includes(module.resourceResolveData.descriptionFileData.name),
          type: wildcardMatch('javascript/*'),
          priority: 10,
          name: (module) => {
            if (module.resourceResolveData.descriptionFileData.name.startsWith('@pixi/')) {
              return 'pixi';
            }
            if (module.resourceResolveData.descriptionFileData.name.startsWith('@microsoft/applicationinsights-')) {
              return 'insights';
            }
            switch (module.resourceResolveData.descriptionFileData.name) {
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
              case '@microsoft/dynamicproto-js':
                return 'insights';
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
