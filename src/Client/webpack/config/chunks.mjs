import { minimatch } from 'minimatch';
import path from 'node:path';
import webpack from 'webpack';
import { dir } from '../utils.mjs';

/** @typedef { Pick<webpack.RuleSetRule, 'include' | 'exclude'> } SideEffects */
/** @typedef { Exclude<NonNullable<webpack.Configuration["optimization"]>["splitChunks"], boolean | undefined>["cacheGroups"] } CacheGroups */

/**
 * @param {...string} patterns
 * @returns {(value: string) => boolean}
 */
// eslint-disable-next-line arrow-body-style
const wildcardMatch = (...patterns) => {
  return (value) => patterns.some((pattern) => minimatch(value, pattern));
};

const pixiSideEffects = [
  path.resolve(dir.pixi, 'lib', 'app'),
  path.resolve(dir.pixi, 'lib', 'unsafe-eval'),
  path.resolve(dir.pixi, 'lib', 'scene', 'graphics')
];

/** @type {SideEffects} */
export const sideEffects = {
  include: [dir.src, dir.pixi],
  exclude: [path.resolve(dir.src, 'polyfills.mjs'), ...pixiSideEffects]
};

/** @type {(assetFilename: string) => boolean} */
export const performanceFilter = (assetFilename) => {
  if (minimatch(assetFilename, 'pixi.*.*js')) {
    return false;
  }
  return true;
};

/** @type {CacheGroups} */
export const cacheGroups = {
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
    test: (/** @type {webpack.NormalModule} */ module) =>
      module.resource && // ensure module is webpack.NormalModule
      minimatch(module.resource, path.resolve(dir.node_modules, '**'), { windowsPathsNoEscape: true }),
    type: wildcardMatch('javascript/*'),
    name: (/** @type {webpack.NormalModule} */ module) =>
      mapVendorModuleToChunk(module.resourceResolveData?.descriptionFileData.name)
  },
  ignored: {
    test: (/** @type {webpack.NormalModule} */ module) =>
      module.identifier && module.identifier().startsWith('ignored|'),
    type: wildcardMatch('javascript/*'),
    name: (/** @type {webpack.NormalModule} */ module) => {
      console.warn(`Using ignored module: ${module.identifier()}`);
      const [, modulePath] = module.identifier().split('|');
      const moduleName = path.relative(dir.node_modules, modulePath);
      return mapVendorModuleToChunk(moduleName);
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
  if (moduleName.startsWith('@microsoft/applicationinsights-')) {
    return 'insights';
  }
  // cSpell:disable
  switch (moduleName) {
    case 'webpack':
    case 'webpack-dev-server':
    case 'ansi-html-community':
    case 'html-entities':
    case 'events':
    case 'mini-css-extract-plugin':
      return 'development';
    case 'pixi.js':
    case '@pixi/colord':
    case 'earcut':
    case 'eventemitter3':
    case 'parse-svg-path':
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
    default:
      throw Error(`Unspecified cache group for node_modules package: ${moduleName}`);
  }
  // cSpell:enable
}
