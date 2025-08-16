import { minimatch } from 'minimatch';
import fs from 'node:fs';
import path from 'node:path';
import webpack from 'webpack';
import { dir } from '../dir.mjs';

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

/**
 * @param {string} targetFolder
 * @param {webpack.Module} module
 * @returns {boolean}
 */
const cacheGroupFolderTest = (targetFolder, module) =>
  !!(/** @type {webpack.NormalModule} */ (module).resource) && // ensure module is webpack.NormalModule
  minimatch(/** @type {webpack.NormalModule} */ (module).resource, path.resolve(targetFolder, '**'), {
    windowsPathsNoEscape: true
  });

/**
 * @param {string} identifier
 * @param {string | undefined} relativePath
 * @returns {string}
 */
const resolveVendorModuleName = (identifier, relativePath) => {
  if (!relativePath) {
    throw new Error(`Can not resolve name for: ${identifier}`);
  }

  const packageJsonPath = path.resolve(dir.node_modules, relativePath, 'package.json');

  const packageJson = fs.existsSync(packageJsonPath) && fs.readFileSync(packageJsonPath, 'utf8');
  if (packageJson) {
    const { name } = JSON.parse(packageJson);
    if (name) {
      return name;
    }
  }

  const parentPath = path.dirname(relativePath);
  if (parentPath === '.') {
    return '';
  }

  return resolveVendorModuleName(identifier, parentPath);
};

/**
 * @param {webpack.Module} module
 * @returns {string}
 */
const vendorModuleToModuleName = (module) => {
  const normalModule = /** @type {webpack.NormalModule} */ (module);
  return (
    /** @type {string | undefined} */ (normalModule.resourceResolveData?.descriptionFileData?.name) ||
    resolveVendorModuleName(normalModule.identifier(), normalModule.resourceResolveData?.descriptionFileRoot)
  );
};

const pixiSideEffects = [path.resolve(dir.src, 'renderers', 'pixi', 'implementation', 'initialization.mjs')];

/** @type {SideEffects} */
export const sideEffects = {
  include: [dir.src, dir.pixi],
  exclude: [path.resolve(dir.src, 'polyfills.mjs'), ...pixiSideEffects]
};

/** @type {(assetFilename: string) => boolean} */
export const performanceFilter = (assetFilename) => !minimatch(assetFilename, 'pixi.*.*js');

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
  renderers: {
    // Have all renderers except for Pixi be in the game chunk
    test: (/** @type {webpack.Module} */ module) =>
      cacheGroupFolderTest(path.resolve(dir.src, 'renderers'), module) &&
      !cacheGroupFolderTest(path.resolve(dir.src, 'renderers', 'pixi'), module),
    type: wildcardMatch('javascript/*'),
    name: 'game'
  },
  pixi: {
    test: (/** @type {webpack.Module} */ module) =>
      cacheGroupFolderTest(path.resolve(dir.src, 'renderers', 'pixi'), module),
    type: wildcardMatch('javascript/*'),
    name: 'pixi'
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
    test: (/** @type {webpack.Module} */ module) => cacheGroupFolderTest(dir.node_modules, module),
    type: wildcardMatch('javascript/*'),
    name: (/** @type {webpack.Module} */ module) => mapVendorModuleNameToChunk(vendorModuleToModuleName(module))
  },
  ignored: {
    test: (/** @type {webpack.Module} */ module) => module.identifier && module.identifier().startsWith('ignored|'),
    type: wildcardMatch('javascript/*'),
    name: (/** @type {webpack.Module} */ module) => {
      console.warn(`Using ignored module: ${module.identifier()}`);
      const [, modulePath] = module.identifier().split('|');
      const moduleName = path.relative(dir.node_modules, modulePath);
      return mapVendorModuleNameToChunk(moduleName);
    }
  }
};

/**
 * @param {string | undefined} moduleName
 * @returns {string}
 */
function mapVendorModuleNameToChunk(moduleName) {
  // https://webpack.js.org/plugins/split-chunks-plugin/#splitchunksname
  // "You can also use on demand named chunks, but you must be careful that the selected modules are only used under this chunk."
  if (moduleName?.startsWith('@microsoft/applicationinsights-')) {
    return 'insights';
  }
  // cSpell:disable
  switch (moduleName) {
    case 'webpack':
    case 'webpack-dev-server':
    case 'ansi-html-community':
    case 'html-entities':
    case 'events':
    case 'mini-css-extract-plugin': {
      return 'development';
    }
    case '@babel/runtime': {
      return 'app';
    }
    case 'pixi.js':
    case '@pixi/colord':
    case 'earcut':
    case 'eventemitter3':
    case 'parse-svg-path': {
      return 'pixi';
    }
    case 'core-js': {
      return 'polyfills';
    }
    case 'unfetch-polyfill': {
      return 'polyfills';
    }
    case 'navigator.sendbeacon': {
      return 'polyfills';
    }
    case 'element-polyfill': {
      return 'polyfills';
    }
    case '@microsoft/dynamicproto-js':
    case '@nevware21/ts-async':
    case '@nevware21/ts-utils': {
      return 'insights';
    }
    default: {
      throw new Error(`Unspecified cache group for node_modules package: ${moduleName}`);
    }
  }
  // cSpell:enable
}
