import coreJs from 'core-js/package.json' with { type: 'json' };

/** Augment types with newer definitions since DefinitelyTyped for @babel/core and @babel/preset-env is not updated - 2024-02-11 */
/** @typedef { import("@babel/core").SimpleCacheConfigurator & { (forever: boolean): void } } SimpleCacheConfigurator */
/** @typedef { import("@babel/core").ConfigAPI & { cache: SimpleCacheConfigurator } } ConfigAPI */
/** @typedef { import("@babel/core").TransformOptions } TransformOptions */
/** @typedef { (api: ConfigAPI) => TransformOptions } ConfigFunction */
/** @typedef { import("@babel/preset-env").CorejsVersion | string } CorejsVersion */
/** @typedef { import("@babel/preset-env").Options & { corejs: CorejsVersion } } BabelPresetEnvOptions */

/** @type {ConfigFunction} */
export default (api) => {
  api.cache(true);

  return {
    presets: [
      [
        '@babel/preset-env',
        /** @type {BabelPresetEnvOptions} */
        ({
          useBuiltIns: 'usage',
          // https://babeljs.io/docs/babel-preset-env#corejs
          // "It is recommended to specify the minor version"
          corejs: coreJs.version,
          bugfixes: true
        })
      ]
    ]
  };
};
