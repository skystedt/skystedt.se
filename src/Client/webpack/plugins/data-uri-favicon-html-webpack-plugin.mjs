// cSpell:ignore datauri, subresource
import datauri from 'datauri';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';

export default class DataUriFaviconHtmlWebpackPlugin {
  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap(DataUriFaviconHtmlWebpackPlugin.name, (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tapPromise(
        DataUriFaviconHtmlWebpackPlugin.name,
        async (data) => {
          this.#preventIntegrityProcessing(data.headTags);
          return data;
        }
      );
      HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration.tapPromise(
        DataUriFaviconHtmlWebpackPlugin.name,
        async (data) => {
          if (data.plugin.options?.favicon) {
            data.assets.favicon = await this.#convertToDataUri(data.plugin.options.favicon);
          }
          return data;
        }
      );
    });
  }

  /**
   * @param {string} path
   * @returns {Promise<string>}
   */
  async #convertToDataUri(path) {
    const dataUri = await datauri(path);
    if (dataUri) {
      return dataUri;
    }
    return path;
  }

  /** @param {HtmlWebpackPlugin.HtmlTagObject[]} tags */
  #preventIntegrityProcessing(tags) {
    // webpack-subresource-integrity tries to process tags from html-webpack-plugin
    // webpack-subresource-integrity does not work with data URIs
    // favicon should not have a integrity attribute
    // prevent favicon from being processed by adding an integrity attribute
    const linkIconTag = tags.find((tag) => tag.tagName === 'link' && tag.attributes.rel === 'icon');
    if (linkIconTag && !Object.prototype.hasOwnProperty.call(linkIconTag.attributes, 'integrity')) {
      linkIconTag.attributes.integrity = undefined;
    }
  }
}
