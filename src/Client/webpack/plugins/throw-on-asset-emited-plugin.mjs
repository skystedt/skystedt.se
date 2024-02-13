import { glob } from 'glob';
import webpack from 'webpack';

export default class ThrowOnAssetEmitedPlugin {
  /** @type {string} */
  #directory;
  /** @type {string[]} */
  #patterns;

  /**
   * @param {string} directory
   * @param {...string} patterns
   */
  constructor(directory, ...patterns) {
    this.#directory = directory;
    this.#patterns = /** @type {string[]} */ ([]).concat(patterns || []);
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise('ThrowOnAssetEmitedWebpackPlugin', async () => {
      const found = [];
      for (const pattern of this.#patterns) {
        const files = await glob(pattern, { cwd: this.#directory });
        if (files.length) {
          found.push(files);
        }
      }
      if (found.length) {
        throw new Error(
          `ThrowOnAssetEmitedWebpackPlugin - Following assets are not permitted to be emited \n${found.join('\n')}`
        );
      }
    });
  }
}
