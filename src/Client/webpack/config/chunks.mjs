import { minimatch } from 'minimatch';
import fs from 'node:fs';
import path from 'node:path';
import webpack from 'webpack';
import { dir } from '../dir.mjs';
import { isSubPath } from '../utilities.mjs';

/** @typedef { Pick<webpack.RuleSetRule, 'include' | 'exclude'> } SideEffects */
/** @typedef { NonNullable<Exclude<NonNullable<webpack.Configuration["optimization"]>["splitChunks"], boolean | undefined>["cacheGroups"]> } FullCacheGroups */
// eslint-disable-next-line jsdoc/reject-function-type
/** @typedef { Exclude<Exclude<Extract<FullCacheGroups[string], object>, Function>, RegExp> } CacheGroup */
/** @typedef {{ [index: string]: false | CacheGroup } } CacheGroups */

/** @type {(assetFilename: string) => boolean} */
export const performanceFilter = (assetFilename) => !minimatch(assetFilename, 'pixi.*.*js');

const pixiSideEffects = [path.resolve(dir.src, 'renderers', 'pixi', 'implementation', 'initialization.mjs')];

/** @type {SideEffects} */
export const sideEffects = {
  include: [dir.src, dir.pixi],
  exclude: [path.resolve(dir.src, 'polyfills.mjs'), ...pixiSideEffects]
};

/**
 * @param {string} filePath
 * @returns {boolean}
 */
export const transformPackages = (filePath) => {
  const isNodeModule = isSubPath(dir.node_modules, filePath);
  if (!isNodeModule) {
    return false;
  }

  const moduleName = Chunks.resolveModuleName(filePath);
  const chunk = Chunks.mapVendorModuleNameToChunk(moduleName);

  switch (chunk) {
    case 'development': {
      return false;
    }

    case 'babel_runtime': {
      return true;
    }

    case 'pixi': {
      return false; // pixi.js is transformed but handled separately
    }

    case 'polyfills': {
      // eslint-disable-next-line sonarjs/prefer-single-boolean-return
      if (moduleName === 'core-js') {
        return false; // don't transform core-js
      }
      return true;
    }

    case 'insights': {
      return false; // application insights is already transformed to ES5
    }

    default: {
      throw new Error(`Unspecified transform configuration for package: ${moduleName}, chunk: ${chunk}`);
    }
  }
};

export class Chunks {
  /**
   * @param {'modern' | 'legacy'} build
   * @returns {CacheGroups}
   */
  static cacheGroups(build) {
    return /** @type {CacheGroups} */ ({
      default: false, // disable default/defaultVendors cache groups, to prevent entrypoints to end up in their own chunks
      defaultVendors: false,
      app: {
        test: path.resolve(dir.src, 'index.mjs'),
        type: this.#wildcardMatch('javascript/*'),
        name: 'app'
      },
      styles: {
        test: dir.src,
        type: this.#wildcardMatch('css/*'),
        name: 'styles'
      },
      game: {
        test: path.resolve(dir.src, 'game'),
        type: this.#wildcardMatch('javascript/*', 'asset/inline'),
        name: 'game'
      },
      renderers: {
        // Have all renderers except for Pixi be in the game chunk
        test: (module) =>
          this.#cacheGroupFolderTest(path.resolve(dir.src, 'renderers'), module) &&
          !this.#cacheGroupFolderTest(path.resolve(dir.src, 'renderers', 'pixi'), module),
        type: this.#wildcardMatch('javascript/*'),
        name: 'game'
      },
      pixi: {
        test: (module) => this.#cacheGroupFolderTest(path.resolve(dir.src, 'renderers', 'pixi'), module),
        type: this.#wildcardMatch('javascript/*'),
        name: 'pixi'
      },
      insights: {
        test: path.resolve(dir.src, 'insights'),
        type: this.#wildcardMatch('javascript/*'),
        name: 'insights'
      },
      polyfills: {
        test: path.resolve(dir.src, 'polyfills.mjs'),
        type: this.#wildcardMatch('javascript/*'),
        name: 'polyfills'
      },
      babel_runtime: {
        test: (module) => this.#cacheGroupFolderTest(path.resolve(dir.node_modules, '@babel/runtime'), module),
        type: this.#wildcardMatch('javascript/*'),
        name: build === 'modern' ? 'app' : 'polyfills'
      },
      vendors: {
        test: (module) => this.#cacheGroupFolderTest(dir.node_modules, module),
        type: this.#wildcardMatch('javascript/*'),
        name: (module) => this.mapVendorModuleNameToChunk(this.#vendorModuleToModuleName(module))
      },
      ignored: {
        test: (module) => module.identifier && module.identifier().startsWith('ignored|'),
        type: this.#wildcardMatch('javascript/*'),
        name: (module) => {
          console.warn(`Using ignored module: ${module.identifier()}`);
          const [, modulePath] = module.identifier().split('|');
          const moduleName = path.relative(dir.node_modules, modulePath);
          return this.mapVendorModuleNameToChunk(moduleName);
        }
      }
    });
  }

  /**
   * @param {string | undefined} moduleName
   * @returns {string}
   */
  static mapVendorModuleNameToChunk(moduleName) {
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
        return 'babel_runtime';
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

  /**
   * @param {string | undefined} relativePath
   * @returns {string}
   */
  static resolveModuleName = (relativePath) => {
    if (!relativePath) {
      return '';
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

    return this.resolveModuleName(parentPath);
  };

  /**
   * @param {...string} patterns
   * @returns {(value: string) => boolean}
   */
  static #wildcardMatch(...patterns) {
    return (value) => patterns.some((pattern) => minimatch(value, pattern));
  }

  /**
   * @param {string} targetFolder
   * @param {webpack.Module} module
   * @returns {boolean}
   */
  static #cacheGroupFolderTest(targetFolder, module) {
    return isSubPath(targetFolder, /** @type {webpack.NormalModule} */ (module).resource);
  }

  /**
   * @param {webpack.Module} module
   * @returns {string}
   */
  static #vendorModuleToModuleName(module) {
    const normalModule = /** @type {webpack.NormalModule} */ (module);

    const descriptionFileName = /** @type {string | undefined} */ (
      normalModule.resourceResolveData?.descriptionFileData?.name
    );
    if (descriptionFileName) {
      return descriptionFileName;
    }

    const descriptionFileRoot = normalModule.resourceResolveData?.descriptionFileRoot;
    if (descriptionFileRoot) {
      return this.resolveModuleName(descriptionFileRoot);
    }

    throw new Error(`Can not resolve name for: ${normalModule.identifier()}`);
  }
}
