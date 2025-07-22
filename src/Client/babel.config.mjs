// cSpell:ignore: corejs
import corejs from 'core-js/package.json' with { type: 'json' };

/** @typedef { import("@babel/core").TransformOptions } TransformOptions */
/** @typedef { import("@babel/core").PluginItem } PluginItem */
/** @typedef { import("@babel/core").PluginOptions } PluginOptions */
/** Augment types with newer definitions since DefinitelyTyped for @babel/core is not updated - 2025-06-01 */
/** @typedef { import("@babel/core").SimpleCacheConfigurator & { (forever: boolean): void } } SimpleCacheConfigurator */
/** @typedef { import("@babel/core").ConfigAPI & { cache: SimpleCacheConfigurator } } ConfigAPI */
/** @typedef { (api: ConfigAPI) => TransformOptions } ConfigFunction */

/** @typedef { import("@babel/preset-env").Options } BabelPresetEnvOptions */

/**
 * @param {PluginOptions} [additionalOptions]
 * @returns {PluginItem}
 */
export const polyfillCorejs = (additionalOptions) => [
  'polyfill-corejs3',
  {
    method: 'usage-global',
    // https://github.com/babel/babel-polyfills/tree/main/packages/babel-plugin-polyfill-corejs3#version
    // "It is recommended to specify the minor version"
    version: corejs.version,

    ...additionalOptions
  }
];

// we don't want polyfills in modern, but instead of disabling them, we exclude the ones that would be added (to check that we don't use unwanted functionality)
export const polyfillCorejsExcluded = [
  'es.error.cause', // mostly unsupported on older browsers, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause
  'es.array.push', // length not properly set for arrays larger than 0x100000000, https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/es.array.push.js

  // small number of older browsers
  'es.array.includes',
  'es.array.iterator',
  'es.array.reduce',
  'es.iterator.constructor',
  'es.iterator.filter',
  'es.iterator.find',
  'es.iterator.for-each',
  'es.iterator.reduce',
  'es.json.stringify',
  'es.regexp.exec',
  'es.regexp.to-string',
  'es.parse-int',
  'es.parse-float',
  'es.promise',
  'es.string.includes',
  'es.string.match',
  'es.string.pad-start',
  'es.weak-map',
  'esnext.iterator.constructor',
  'esnext.iterator.filter',
  'esnext.iterator.find',
  'esnext.iterator.for-each',
  'esnext.iterator.reduce',
  'web.dom-collections.iterator'
];

/** @type {ConfigFunction} */
export default (api) => {
  api.cache(true);

  return {
    presets: [
      [
        '@babel/preset-env',
        /** @type {BabelPresetEnvOptions} */
        ({
          bugfixes: true
        })
      ]
    ],
    plugins: [polyfillCorejs()]
  };
};
