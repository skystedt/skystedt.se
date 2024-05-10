/* eslint-env node */
const coreJs = require('core-js/package.json');

/** Augment types with newer definitions since DefinitelyTyped for @babel/core and @babel/preset-env is not updated - 2024-02-11 */
/** @typedef { import("@babel/core").SimpleCacheConfigurator & { (forever: boolean): void } } SimpleCacheConfigurator */
/** @typedef { import("@babel/core").ConfigAPI & { cache: SimpleCacheConfigurator } } ConfigAPI */
/** @typedef { import("@babel/core").TransformOptions } TransformOptions */
/** @typedef { (api: ConfigAPI) => TransformOptions } ConfigFunction */
/** @typedef { import("@babel/preset-env").CorejsVersion | string } CorejsVersion */
/** @typedef { import("@babel/preset-env").Options & { corejs: CorejsVersion } } BabelOptions */

/** @type {ConfigFunction} */
module.exports = (api) => {
  api.cache(true);

  return {
    presets: [
      [
        '@babel/preset-env',
        /** @type {BabelOptions} */
        ({
          useBuiltIns: 'usage',
          // https://github.com/zloirock/core-js#babelpreset-env
          // "Recommended to specify used minor core-js version"
          corejs: coreJs.version,
          bugfixes: true
        })
      ]
    ]
  };
};
