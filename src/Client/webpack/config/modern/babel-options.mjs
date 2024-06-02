/** @typedef { import("@babel/preset-env").Options | { browserslistEnv: string }} BabelPresetEnvOptions */

// when ThrowOnAssetEmittedPlugin is thrown for polyfills.*.mjs, set debug to true to find what files/polyfills is causing it
// http://zloirock.github.io/core-js/compat/

/** @type {BabelPresetEnvOptions} */
export const babelPresetEnvOptions = {
  browserslistEnv: 'modern',
  debug: false,
  exclude: [
    'web.dom-collections.iterator', // needed for older ios, added when using any for-of, but is not needed if not using for-of on DOM collections, https://github.com/zloirock/core-js/issues/1003
    'es.error.cause', // needed for older ios/safari, newer option that can be used with Error, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
    'es.array.push', // needed for modern browsers, length not properly set for arrays larger than 0x100000000, https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/es.array.push.js
    // needed for older ios/safari, different error is thrown, https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/es.array.push.js
    'es.array.reduce' // chrome 79
  ]
};

/** @type {BabelPresetEnvOptions} */
export const pixiBabelPresetEnvOptions = {
  browserslistEnv: 'modern',
  debug: false,
  exclude: [
    'es.array.push',
    'es.array.reduce',
    'es.array.unshift',
    'es.array-buffer.detached',
    'es.array-buffer.transfer',
    'es.array-buffer.transfer-to-fixed-length',
    'es.error.cause',
    'es.string.replace',
    'es.typed-array.at',
    'es.typed-array.fill',
    'es.typed-array.find-last',
    'es.typed-array.find-last-index',
    'es.typed-array.float32-array',
    'es.typed-array.int16-array',
    'es.typed-array.int32-array',
    'es.typed-array.int8-array',
    'es.typed-array.set',
    'es.typed-array.sort',
    'es.typed-array.to-reversed',
    'es.typed-array.to-sorted',
    'es.typed-array.uint16-array',
    'es.typed-array.uint32-array',
    'es.typed-array.uint8-array',
    'es.typed-array.uint8-clamped-array',
    'es.typed-array.with',
    'esnext.array-buffer.detached',
    'esnext.array-buffer.transfer',
    'esnext.array-buffer.transfer-to-fixed-length',
    'esnext.typed-array.at',
    'esnext.typed-array.find-last',
    'esnext.typed-array.find-last-index',
    'esnext.typed-array.to-reversed',
    'esnext.typed-array.to-sorted',
    'esnext.typed-array.with',
    'web.dom-collections.iterator',
    'web.dom-exception.stack',
    'web.url',
    'web.url.to-json',
    'web.url-search-params',
    'web.url-search-params.delete',
    'web.url-search-params.has',
    'web.url-search-params.size'
  ]
};
