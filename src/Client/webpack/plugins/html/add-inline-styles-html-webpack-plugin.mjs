// cSpell:ignore datauri, subresource
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';

export default class AddInlineStylesHtmlWebpackPlugin {
  #styles;

  /** @param {string} styles */
  constructor(styles) {
    this.#styles = styles;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap(AddInlineStylesHtmlWebpackPlugin.name, (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tap(AddInlineStylesHtmlWebpackPlugin.name, (data) => {
        const tag = HtmlWebpackPlugin.createHtmlTagObject(
          'style',
          { type: 'text/css' },
          this.#styles,
          // @ts-ignore
          { plugin: AddInlineStylesHtmlWebpackPlugin.name }
        );
        data.assetTags.styles.push(tag);
        return data;
      });
    });
  }
}
