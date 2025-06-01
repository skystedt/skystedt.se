// cSpell:ignore subresource
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';

/*
 * HtmlWebpackPlugin hooks processAssets at stage PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
 * https://github.com/jantimon/html-webpack-plugin/blob/v5.6.3/index.js#L2
 * 
 * When using [contenthash] with realContentHash = true then webpack.optimize.RealContentHashPlugin will recalculate the hashes of assets
 * webpack.optimize.RealContentHashPlugin hooks processAssets at stage PROCESS_ASSETS_STAGE_OPTIMIZE_HASH
 * https://github.com/webpack/webpack/blob/v5.99.9/lib/optimize/RealContentHashPlugin.js#L164
 * 
 * To be able to get the recalculated hashes, we need to move HtmlWebpackPlugin to hook after RealContentHashPlugin
 * example of moving HtmlWebpackPlugin: https://github.com/jantimon/html-webpack-plugin/issues/1700#issuecomment-964433198
 *
 * THis affects plugins that depends on HtmlWebpackPlugin and that uses the hashes, for example:
 * - webpack-subresource-integrity
 */
export default class MoveHookHtmlWebpackPlugin {
  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap(MoveHookHtmlWebpackPlugin.name, (compilation) => {
      compilation.hooks.processAssets.intercept({
        register: (tap) => {
          if (
            tap.name === HtmlWebpackPlugin.name &&
            tap.stage === webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
          ) {
            // move HtmlWebpackPlugin to after optimize.RealContentHashPlugin
            tap.stage = webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH + 1;
          }
          return tap;
        }
      });
    });
  }
}
