/* eslint-env node */
import path from 'path';
import webpack from 'webpack';
import browserslist from 'browserslist';
import babel, { loadPartialConfigAsync as loadBabelConfigAsync } from '@babel/core';
import babelPresetEnv from '@babel/preset-env';

const cwd = process.cwd();
export const dir = {
  root: path.resolve(cwd),
  src: path.resolve(cwd, 'src'),
  dist: path.resolve(cwd, 'dist'),
  node_modules: path.resolve(cwd, 'node_modules')
};

/**
 * @param {string} environment
 * @returns {{ browsers: string[], versions: {[string]:string[]}, config: string | undefined }}
 */
export const browserslistEnvironment = (environment) => {
  const browsers = browserslist(null, { env: environment });
  const versions = browsers.reduce((map, value) => {
    const split = value.split(' ');
    map[split[0]] = [...(map[split[0]] || []), split[1]].sort();
    return map;
  }, {});
  let config = browserslist.loadConfig({ path: dir.src, env: environment });
  config = Array.isArray(config) ? config.join(' or ') : config;
  return { browsers, versions, config };
};

/**
 * @param {webpack.Configuration} configuration
 * @param {Function} processFn
 */
export const extendCspPlugin = (configuration, processFn) => {
  const originalPlugin = configuration.plugins.find((plugin) => plugin.constructor.name === 'CspHtmlWebpackPlugin');
  if (originalPlugin) {
    const originalProcessFn = originalPlugin.opts.processFn;
    const options = Object.assign({}, originalPlugin.opts);
    options.processFn = (...parameters) => {
      originalProcessFn(...parameters);
      processFn(...parameters);
    };
    originalPlugin.opts = Object.freeze(options);
  }
};

/**
 * @typedef {import("immutability-helper").Spec<webpack.Configuration>} ImmutabilityHelperSpec
 * @param {webpack.Configuration} configuration
 * @returns {ImmutabilityHelperSpec}
 */
export const mergeRules = (configuration) => {
  return {
    mode: { $set: configuration.mode },
    devtool: { $set: configuration.devtool },
    output: { $merge: configuration.output || {} },
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
