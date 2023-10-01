/* eslint-env node */
import path from 'path';
import webpack from 'webpack';
import browserslist from 'browserslist';
import babel, { loadPartialConfigAsync as loadBabelConfigAsync } from '@babel/core';
import babelPresetEnv from '@babel/preset-env';

const cwd = process.cwd();
export const dir = {
  src: path.resolve(cwd, 'src'),
  publish: path.resolve(cwd, '..', 'publish'),
  dist: path.resolve(cwd, '..', 'publish', 'Client'),
  node_modules: path.resolve(cwd, 'node_modules')
};

/**
 * @param {string} environment
 * @returns { string | undefined }
 */
export const browserslistConfig = (environment) => {
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
 * @returns {Promise<babel.TransformOptions>}
 */
export const mergeBabelOptions = async (presetEnvOptions) => {
  const presetName = '@babel/preset-env';

  /** @type {Readonly<babel.PartialConfig>} */
  const { options } = await loadBabelConfigAsync();

  const index = options.presets.findIndex((preset) => preset.file?.request === presetName);

  const mergedOptions = Object.assign({}, options.presets[index].options, presetEnvOptions);

  const presets = [
    ...options.presets.slice(0, index - 1),
    [presetName, mergedOptions],
    ...options.presets.slice(index + 1)
  ];
  return {
    plugins: options.plugins,
    presets: presets
  };
};
