import HtmlWebpackPlugin from 'html-webpack-plugin';
import { minimatch } from 'minimatch';
import webpack from 'webpack';

/** @typedef { 'preload' | 'modulepreload' } Type */
/** @typedef {{ pattern: string, type: Type, attributes?: {} }} Config */

export default class PreloadHtmlWebpackPlugin {
  /** @type {Config[]} */
  #configuration;

  /** @param {Config[]} configuration */
  constructor(configuration) {
    this.#configuration = configuration;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap(PreloadHtmlWebpackPlugin.name, (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapPromise(PreloadHtmlWebpackPlugin.name, async (data) => {
        const files = this.#getPreloadFiles(compilation);
        const tags = this.#createPreloadTags(files);
        data.assetTags.meta.push(...tags);
        return data;
      });
    });
  }

  /**
   * @param {webpack.Compilation} compilation
   * @returns {string[]}
   */
  #getPreloadFiles(compilation) {
    // Based on: https://github.com/jantimon/html-webpack-plugin/issues/1317#issuecomment-704870353
    return [...compilation.entrypoints].flatMap(([, entrypoint]) => {
      const children = entrypoint.getChildrenByOrders(compilation.moduleGraph, compilation.chunkGraph);
      const preloadFiles =
        children.preload?.flatMap((group) => group.chunks.flatMap((chunk) => [...chunk.files])) ?? [];
      // Only include assets that will be emitted
      const assets = preloadFiles.filter((file) => compilation.getAsset(file));
      return assets;
    });
  }

  /**
   * @param {string[]} files
   * @returns {HtmlWebpackPlugin.HtmlTagObject[]}
   */
  #createPreloadTags(files) {
    /** @type {HtmlWebpackPlugin.HtmlTagObject[]} */ const tags = [];
    /** @type {HtmlWebpackPlugin.HtmlTagObject[]} */ const moduleTags = [];

    files?.forEach((file) => {
      this.#configuration.forEach((config) => {
        const match = minimatch(file, config.pattern);
        if (match) {
          const tag = this.#createPreloadTag(file, config.type, config.attributes);

          if (config.type === 'modulepreload') {
            moduleTags.push(tag);
          } else {
            tags.push(tag);
          }
        }
      });
    });

    // Add 'modulepreload' tags before 'preload' tags
    return [...moduleTags, ...tags];
  }

  /**
   * @param {string} file
   * @param {Type} type
   * @param {{} | undefined} attributes
   * @returns {HtmlWebpackPlugin.HtmlTagObject}
   */
  #createPreloadTag(file, type, attributes) {
    return {
      tagName: 'link',
      voidTag: true,
      attributes: {
        rel: type,
        href: file,
        ...attributes
      },
      meta: {
        plugin: PreloadHtmlWebpackPlugin.name
      }
    };
  }
}
