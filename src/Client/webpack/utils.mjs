// cSpell:ignore picocolors
import { loadPartialConfigAsync as loadBabelConfigAsync } from '@babel/core';
import browserslist from 'browserslist';
import path from 'node:path';
import pc from 'picocolors';
import webpack from 'webpack';

/** @typedef { import("@babel/core").PartialConfig } BabelPartialConfig */
/** @typedef { import("@babel/core").ConfigItem } BabelConfigItem */
/** @typedef { import("@babel/preset-env").Options } BabelPresetEnvOptions */

const cwd = process.cwd();
export const dir = {
  src: path.resolve(cwd, 'src'),
  publish: path.resolve(cwd, '..', 'publish'),
  dist: path.resolve(cwd, '..', 'publish', 'Client'),
  node_modules: path.resolve(cwd, 'node_modules')
};

export const printProgress =
  (/** @type {string} */ environment) =>
  (/** @type {number} */ percentage, /** @type {string} */ message, /** @type {string[]} */ ...args) => {
    const percentageString = percentage
      .toLocaleString('en', { style: 'percent', minimumFractionDigits: 2 })
      .padStart('##.##%'.length, ' ');
    // eslint-disable-next-line no-console
    console.info(`[${pc.green(environment)}]`, pc.yellow(percentageString), message, ...args);
  };

/**
 * @param {string} environment
 * @returns { string[] }
 */
export const browserslistBrowsers = (environment) => {
  const browsers = browserslist(null, { env: environment });
  return browsers;
};

/**
 * @typedef {import("immutability-helper").Spec<webpack.Configuration>} ImmutabilityHelperSpec
 * @param {webpack.Configuration} configuration
 * @returns {ImmutabilityHelperSpec}
 */
export const mergeConfigurationRules = (configuration) => ({
  mode: { $set: configuration.mode },
  devtool: { $set: configuration.devtool },
  entry: { $set: configuration.entry },
  optimization: { $merge: configuration.optimization || {} },
  devServer: { $set: configuration.devServer },
  plugins: { $push: configuration.plugins || [] }
});

/**
 * @param {BabelPresetEnvOptions | { browserslistEnv: string}} additionalOptions
 * @returns {Promise<BabelPresetEnvOptions>}
 */
export const mergeBabelPresetEnvOptions = async (additionalOptions) => {
  const presetName = '@babel/preset-env';

  const { options } = /** @type {Readonly<BabelPartialConfig>} */ (await loadBabelConfigAsync());

  const preset = Array.isArray(options.presets)
    ? /** @type {BabelConfigItem | undefined} */ (
        options.presets.find((preset) => /** @type {BabelConfigItem} */ (preset).file?.request === presetName)
      )
    : null;

  const configOptions = /** @type {BabelPresetEnvOptions} */ (preset?.options || {});

  const mergedOptions = {
    ...configOptions,
    ...additionalOptions
  };

  return mergedOptions;
};
