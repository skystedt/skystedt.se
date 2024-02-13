/* eslint-env node */
import { loadPartialConfigAsync as loadBabelConfigAsync } from '@babel/core';
import babelPresetEnv from '@babel/preset-env';
import browserslist from 'browserslist';
import path from 'node:path';
import pc from 'picocolors';
import webpack from 'webpack';

/** @typedef { import("@babel/core").TransformOptions } BabelTransformOptions */
/** @typedef { import("@babel/core").PartialConfig } BabelPartialConfig */
/** @typedef { import("@babel/core").ConfigItem } BabelConfigItem */

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
 * @returns { string | undefined }
 */
export const browserslistConfig = (environment) => {
  /** @type {string[] | string | undefined} */
  let config = browserslist.loadConfig({ path: dir.src, env: environment });
  config = Array.isArray(config) ? config.join(' or ') : config;
  return config;
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
export const mergeConfigurationRules = (configuration) => {
  return {
    mode: { $set: configuration.mode },
    devtool: { $set: configuration.devtool },
    entry: { $set: configuration.entry },
    optimization: { $merge: configuration.optimization || {} },
    devServer: { $set: configuration.devServer },
    plugins: { $push: configuration.plugins || [] }
  };
};

/**
 * @param {babelPresetEnv.Options | { browserslistEnv: string}} presetEnvOptions
 * @returns {Promise<BabelTransformOptions>}
 */
export const mergeBabelOptions = async (presetEnvOptions) => {
  const presetName = '@babel/preset-env';

  const { options } = /** @type {!Readonly<BabelPartialConfig>} */ (await loadBabelConfigAsync());
  let presets = options.presets;

  if (Array.isArray(options.presets)) {
    const index = options.presets.findIndex(
      (preset) => /** @type {BabelConfigItem} */ (preset).file?.request === presetName
    );

    if (index !== -1) {
      const mergedOptions = Object.assign(
        {},
        /** @type {BabelConfigItem} */ (options.presets[index]).options,
        presetEnvOptions
      );

      presets = [...options.presets];
      presets[index] = [presetName, mergedOptions];
    }
  }

  return {
    plugins: options.plugins,
    presets: presets
  };
};
