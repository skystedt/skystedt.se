import webpack from 'webpack';
import CspHtmlWebpackPlugin from 'csp-html-webpack-plugin';

// Override method for getShas to find precalculated hashes in integrity attributes
export default class ExtendedCspHtmlWebpackPlugin extends CspHtmlWebpackPlugin {
  getShas($, policyName, selector) {
    const shas = super.getShas($, policyName, selector);
    const integritySelector = selector.replace(/:not\((\[.+\])\)/, '$1[integrity]');
    const integrityShas = $(integritySelector)
      .map((_i, element) => `'${$(element).attr('integrity')}'`)
      .get();
    return shas.concat(integrityShas);
  }
}

/**
 * @param {webpack.Configuration} configuration
 * @param {Function} processFn
 */
export const extendCspPluginProcessFn = (configuration, processFn) => {
  const cspPlugin = configuration.plugins.find((plugin) => plugin.constructor.name === 'ExtendedCspHtmlWebpackPlugin');
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
