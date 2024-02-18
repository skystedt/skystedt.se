import CspHtmlWebpackPlugin from 'csp-html-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';

/** @typedef {import("cheerio").CheerioAPI} cheerio */
/** @typedef {(builtPolicy: string, htmlPluginData: object, $: cheerio) => void} CspHtmlWebpackPlugin_processFn */
/** @typedef {($: cheerio, policyName: string, selector: string) => string[]} CspHtmlWebpackPlugin_getShas */
/** @typedef {CspHtmlWebpackPlugin & { opts: { processFn: CspHtmlWebpackPlugin_processFn} }} CspHtmlWebpackPlugin_with_processFn */

/** Extend CspHtmlWebpackPlugin to work with SRI hashes on scripts */
export default class ExtendedCspHtmlWebpackPlugin extends CspHtmlWebpackPlugin {
  /**
   * @param {CspHtmlWebpackPlugin.Policy} policy
   * @param {CspHtmlWebpackPlugin.AdditionalOptions & { processFn: CspHtmlWebpackPlugin_processFn }} options
   */
  constructor(policy, options) {
    super(policy, options);
  }

  /** @param {webpack.Compiler} compiler */
  // @ts-ignore
  apply(compiler) {
    // @ts-ignore
    super.apply(compiler);

    // HtmlWebpackPlugin hooks processAssets with stage PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
    // https://github.com/jantimon/html-webpack-plugin/blob/v5.6.0/index.js#L159
    // When using [contenthash] with realContentHash = true then webpack.optimize.RealContentHashPlugin will recalculate the hashes of assets
    // To be able to get the recalculated hashes in getShas, we need to move HtmlWebpackPlugin to after RealContentHashPlugin
    // example of moving HtmlWebpackPlugin:
    // https://github.com/jantimon/html-webpack-plugin/issues/1700#issuecomment-964433198
    compiler.hooks.compilation.tap(ExtendedCspHtmlWebpackPlugin.name, (compilation) => {
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

  /**
   * Override getShas to include calculated hashes from integrity attributes
   * @type {CspHtmlWebpackPlugin_getShas}
   */
  getShas($, policyName, selector) {
    // @ts-ignore
    const originalShas = /** @type {string[]} */ (super.getShas($, policyName, selector));

    const integritySelector = selector.replace(/:not\((\[.+\])\)/, '$1[integrity]');
    const integrityShas = $(integritySelector)
      .map((_i, element) => `'${$(element).attr('integrity')}'`)
      .get();

    return originalShas.concat(integrityShas);
  }
}

/**
 * @param {webpack.Configuration} configuration
 * @param {CspHtmlWebpackPlugin_processFn} processFn
 */
export const extendCspPluginProcessFn = (configuration, processFn) => {
  const cspPlugin = /** @type {CspHtmlWebpackPlugin_with_processFn | undefined} */ (
    configuration.plugins?.find((plugin) => plugin?.constructor.name === ExtendedCspHtmlWebpackPlugin.name)
  );
  if (cspPlugin) {
    const originalProcessFn = cspPlugin.opts.processFn;
    const options = Object.assign({}, cspPlugin.opts);
    options.processFn = (...parameters) => {
      originalProcessFn(...parameters);
      processFn(...parameters);
    };
    cspPlugin.opts = Object.freeze(options);
  }
};
