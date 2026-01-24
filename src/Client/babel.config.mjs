// cSpell:ignore: corejs
import babelRuntime from '@babel/runtime/package.json' with { type: 'json' };
import corejs from 'core-js/package.json' with { type: 'json' };

/** @typedef { import("@babel/core").TransformOptions } TransformOptions */
/** @typedef { import("@babel/core").PluginItem } PluginItem */
/** @typedef { import("@babel/core").PluginOptions } PluginOptions */
/** Augment types with newer definitions since DefinitelyTyped for '@babel/core' is not updated - 2025-06-01 */
/** @typedef { import("@babel/core").SimpleCacheConfigurator & { (forever: boolean): void } } SimpleCacheConfigurator */
/** @typedef { import("@babel/core").ConfigAPI & { cache: SimpleCacheConfigurator } } ConfigAPI */
/** @typedef { (api: ConfigAPI) => TransformOptions } ConfigFunction */

/** @typedef { import("@babel/preset-env").Options } BabelPresetEnvOptions */

/** @typedef { import("@babel/plugin-transform-runtime").Options } BabelPluginTransformRuntimeOptions */

// we don't want polyfills in modern, but instead of disabling them, we exclude the ones that would be added (to check that we don't use unwanted functionality)
/** @type {PluginOptions} */
export const polyfillCorejsModern = {
  // prettier-ignore
  exclude: [
    // versions checked with
    //   core-js: 3.44.0, https://zloirock.github.io/core-js/master/compat/
    //   browserslist: 1.0.30001727
    //                                            chrome  edge        firefox     ios         opera   opera_m safari      samsung
    'es.array.push',                          //  66-121  18,92-121               10.3-15.8   89-102  80      13.1-15.6   21-25
    'es.iterator.constructor',                //  66-121  18,92-121   78,115-128  10.3-18.3   89-102  80      13.1-18.3   21-25
    'es.iterator.find',                       //  66-134  18,92-134   78,115-140  10.3+       89-117  80      13.1+       21+
    'es.json.parse',                          //  66-113  109-113     115-134     10.3+       92-99           13.1+       21-22
    'es.json.stringify',                      //  66      18                      10.3
    'es.map.get-or-insert',                   //  66-144  109-144     115-143     10.3-26.1   93-128  80      13.1-26.1   21+
    'es.map.get-or-insert-computed',          //  66-144  109-144     115-143     10.3-26.1   93-128  80      13.1-26.1   21+
    'es.promise',                             //  66      18                      10.3
    'es.regexp.exec',                         //          18                      10.3-11.2
    'es.string.pad-start',                    //                                  10.3
    'es.weak-map.get-or-insert',              //  66-144  109-144     115-143     10.3-26.1   93-128  80      13.1-26.1   21+
    'es.weak-map.get-or-insert-computed',     //  66-144  109-144     115-143     10.3-26.1   93-128  80      13.1-26.1   21+
    'esnext.iterator.constructor',            //  66-121  18,92-121   78,115-128  10.3-18.3   89-102  80      13.1-18.3   21-25
    'esnext.iterator.find',                   //  66-134  18,92-134   78,115-140  10.3+       89-117  80      13.1+       21+
    'esnext.json.parse',                      //  66-113  109-113     115-134     10.3+       92-99           13.1+       21-22
    'esnext.map.get-or-insert',               //  66-144  109-144     115-143     10.3-26.1   93-128  80      13.1-26.1   21+
    'esnext.map.get-or-insert-computed',      //  66-144  109-144     115-143     10.3-26.1   93-128  80      13.1-26.1   21+
    'esnext.weak-map.get-or-insert',          //  66-144  109-144     115-143     10.3-26.1   93-128  80      13.1-26.1   21+
    'esnext.weak-map.get-or-insert-computed', //  66-144  109-144     115-143     10.3-26.1   93-128  80      13.1-26.1   21+
    'web.dom-collections.iterator'            //          18                      10.3-12.5
  ],
  // when ThrowOnAssetEmittedPlugin is thrown for polyfills.*.mjs, set debug to true to find what files/polyfills is causing it
  debug: false
};

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

/** @type {ConfigFunction} */
export default function babelConfig(api) {
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
    plugins: [
      [
        '@babel/plugin-transform-runtime', // "Enables the re-use of Babel's injected helper code"
        /** @type {BabelPluginTransformRuntimeOptions} */
        ({
          moduleName: '@babel/runtime',
          version: babelRuntime.version // https://babeljs.io/docs/babel-plugin-transform-runtime#version
        })
      ],
      polyfillCorejs()
    ]
  };
}
