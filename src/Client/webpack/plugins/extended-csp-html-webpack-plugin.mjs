import CspHtmlWebpackPlugin from 'csp-html-webpack-plugin';
import webpack from 'webpack';

/** @typedef {import("cheerio").CheerioAPI} cheerio */
/** @typedef {(builtPolicy: string, htmlPluginData: object, $: cheerio) => void} CspHtmlWebpackPlugin_processFn */
/** @typedef {($: cheerio, policyName: string, selector: string) => string[]} CspHtmlWebpackPlugin_getShas */
/** @typedef {CspHtmlWebpackPlugin & { opts: { processFn: CspHtmlWebpackPlugin_processFn} }} CspHtmlWebpackPlugin_with_processFn */

// Override method for getShas to find precalculated hashes in integrity attributes
export default class ExtendedCspHtmlWebpackPlugin extends CspHtmlWebpackPlugin {
  /** @type {CspHtmlWebpackPlugin_getShas} */
  getShas($, policyName, selector) {
    // @ts-ignore
    const shas = /** @type {string[]} */ (super.getShas($, policyName, selector));
    const integritySelector = selector.replace(/:not\((\[.+\])\)/, '$1[integrity]');
    const integrityShas = $(integritySelector)
      .map((_i, element) => `'${$(element).attr('integrity')}'`)
      .get();
    return shas.concat(integrityShas);
  }

  /**
   * @param {CspHtmlWebpackPlugin.Policy} policy
   * @param {CspHtmlWebpackPlugin.AdditionalOptions & { processFn: CspHtmlWebpackPlugin_processFn }} options
   */
  constructor(policy, options) {
    super(policy, options);
  }

  // @ts-ignore
  apply(compiler) {
    super.apply(compiler);
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
