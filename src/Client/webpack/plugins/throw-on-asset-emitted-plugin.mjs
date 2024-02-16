import { minimatch } from 'minimatch';
import webpack from 'webpack';

export default class ThrowOnAssetEmittedPlugin {
  /** @type {string[]} */
  #patterns;

  /** @param {...string} patterns */
  constructor(...patterns) {
    this.#patterns = /** @type {string[]} */ ([]).concat(patterns || []);
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.assetEmitted.tapPromise(ThrowOnAssetEmittedPlugin.name, async (file) => {
      const forbiddenAssetEmitted = this.#patterns.some((pattern) => minimatch(file, pattern));
      if (forbiddenAssetEmitted) {
        throw new Error(`${ThrowOnAssetEmittedPlugin.name} - Following asset is not permitted: ${file}`);
      }
    });
  }
}
