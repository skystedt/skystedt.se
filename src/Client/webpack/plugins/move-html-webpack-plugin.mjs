import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';

// When using [contenthash] then webpack.optimize.RealContentHashPlugin will run
// calculating the real hashes of the content, updating assets.
// For HtmlWebpackPlugin to have the updated assets, it needs to be moved
export default class MoveHtmlWebpackPlugin {
  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap('MoveHtmlWebpackPlugin', (compilation) => {
      compilation.hooks.processAssets.intercept({
        register: (tap) => {
          if (
            tap.name === HtmlWebpackPlugin.name &&
            tap.stage == webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
          ) {
            // move HtmlWebpackPlugin to after optimize.RealContentHashPlugin is run
            tap.stage = webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH + 1;
          }
          return tap;
        }
      });
    });
  }
}
