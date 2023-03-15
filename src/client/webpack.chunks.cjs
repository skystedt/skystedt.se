/* eslint-env node */
const path = require('path');
const minimatch = require('minimatch');
const { dir } = require('./webpack.helpers.cjs');
const { mathchesPatterns } = require('./webpack.helpers.cjs');
/** @typedef { import("webpack").Configuration } Configuration */
/** @typedef { import("webpack").EntryObject } EntryObject */

/** @type {EntryObject} */
const entry = {
  insights: path.resolve(dir.src, 'insights', 'insights.mjs'),
  app: path.resolve(dir.src, 'index.mjs')
};

/** @type {EntryObject} */
const entryLegacy = {
  polyfills: path.resolve(dir.src, 'polyfills.mjs'),
  app: { dependOn: 'polyfills' }
};

/**
 * @param {...string} patterns
 * @returns {(string) => boolean}
 */
function wildcardMatch(...patterns) {
  return (value) => mathchesPatterns(value, ...patterns);
}

/** @type {Configuration} */
const chunks = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          test: dir.src,
          type: wildcardMatch('css/*'),
          priority: 100,
          name: 'styles',
          chunks: 'all'
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
            minimatch(module.resource, path.resolve(dir.node_modules, '**'), { windowsPathsNoEscape: true }),
          type: wildcardMatch('javascript/*'),
          priority: 10,
          name: (module) => {
            const moduleName = module.resourceResolveData.descriptionFileData.name;
            switch (moduleName) {
              case 'webpack':
              case 'webpack-dev-server':
              case 'ansi-html-community':
              case 'html-entities':
              case 'events':
              case 'mini-css-extract-plugin':
                return 'development';
              case 'colord':
              case 'earcut':
              case 'eventemitter3':
              case 'ismobilejs':
              case 'punycode':
              case 'querystring':
              case 'url':
                return 'pixi';
              case 'core-js':
                return 'polyfills';
              case 'unfetch-polyfill':
                return 'polyfills';
              case 'navigator.sendbeacon':
                return 'polyfills';
              case '@microsoft/dynamicproto-js':
                return 'insights';
            }
            switch (true) {
              case moduleName.startsWith('@pixi/'):
                return 'pixi';
              case moduleName.startsWith('@microsoft/applicationinsights-'):
                return 'insights';
            }
            throw Error('Unspecified cache group for node_modules package: ' + moduleName);
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
