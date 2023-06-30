/* eslint-env node */
const path = require('path');
const { minimatch } = require('minimatch');
const { dir } = require('./webpack.helpers.cjs');
const { mathchesPatterns } = require('./webpack.helpers.cjs');
/** @typedef { import("webpack").Configuration["optimization"] } Optimization */
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

/** @type {Optimization} */
const optimization = {
  splitChunks: {
    cacheGroups: {
      default: false, // disable default/defaultVendors cache groups, to prevent entrypoints to end up in their own chunks
      defaultVendors: false,
      app: {
        test: path.resolve(dir.src, 'index.mjs'),
        type: wildcardMatch('javascript/*'),
        name: 'app'
      },
      styles: {
        test: dir.src,
        type: wildcardMatch('css/*'),
        name: 'styles'
      },
      game: {
        test: path.resolve(dir.src, 'game'),
        type: wildcardMatch('javascript/*', 'asset/inline'),
        name: 'game'
      },
      insights: {
        test: path.resolve(dir.src, 'insights'),
        type: wildcardMatch('javascript/*'),
        name: 'insights'
      },
      polyfills: {
        test: path.resolve(dir.src, 'polyfills.mjs'),
        type: wildcardMatch('javascript/*'),
        name: 'polyfills'
      },
      vendors: {
        test: (module) =>
          module.resource &&
          minimatch(module.resource, path.resolve(dir.node_modules, '**'), { windowsPathsNoEscape: true }),
        type: wildcardMatch('javascript/*'),
        name: (module) => mapVendorModuleToChunk(module.resourceResolveData.descriptionFileData.name)
      },
      ignored: {
        test: (module) => module.identifier().startsWith('ignored|'),
        type: wildcardMatch('javascript/*'),
        name: (module) => {
          console.warn(`Using ignored module: ${module.identifier()}`);
          const [, modulePath] = module.identifier().split('|');
          const moduleName = path.relative(dir.node_modules, modulePath);
          return mapVendorModuleToChunk(moduleName);
        }
      }
    }
  }
};

/**
 * @param {string} moduleName
 * @returns {string}
 */
function mapVendorModuleToChunk(moduleName) {
  // https://webpack.js.org/plugins/split-chunks-plugin/#splitchunksname
  // "You can also use on demand named chunks, but you must be careful that the selected modules are only used under this chunk."
  switch (true) {
    case moduleName.startsWith('@pixi/'):
      return 'pixi';
    case moduleName.startsWith('@microsoft/applicationinsights-'):
      return 'insights';
  }
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
    case '@nevware21/ts-async':
    case '@nevware21/ts-utils':
      return 'insights';
  }
  throw Error(`Unspecified cache group for node_modules package: ${moduleName}`);
}

module.exports = {
  entry,
  entryLegacy,
  cacheGroups: optimization.splitChunks.cacheGroups
};
