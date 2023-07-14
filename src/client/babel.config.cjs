/* eslint-env node */
const coreJs = require('core-js/package.json');
const { ConfigFunction } = require('@babel/core');
const { Options: BabelOptions } = require('@babel/preset-env');

/** @type {ConfigFunction} */
module.exports = (api) => {
  api.cache(true);

  return {
    plugins: ['@babel/plugin-syntax-import-assertions'],
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
