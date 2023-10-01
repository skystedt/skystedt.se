import path from 'path';
import webpack from 'webpack';
import { minimatch } from 'minimatch';
import babelPresetEnv from '@babel/preset-env';
import postcssPresetEnv from 'postcss-preset-env';
import postcssMergeRules from 'postcss-merge-rules';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import _HtmlInlineCssWebpackPlugin from 'html-inline-css-webpack-plugin';
const HtmlInlineCssWebpackPlugin = /** @type {_HtmlInlineCssWebpackPlugin} */ (_HtmlInlineCssWebpackPlugin.default);
import { SubresourceIntegrityPlugin } from 'webpack-subresource-integrity';
import CspHtmlWebpackPlugin from 'csp-html-webpack-plugin';
/* eslint-disable-line import/default */ import CopyPlugin from 'copy-webpack-plugin';
import cacheGroups from '../chunks.mjs';
import BuildInfo from '../../build-info.mjs';
import { dir, browserslistBrowsers, mergeBabelOptions } from '../../utils.mjs';
import postcssRemoveCarriageReturn from '../../postcss/postcss-remove-carriage-return.mjs';
import MoveHtmlWebpackPlugin from '../../plugins/move-html-webpack-plugin.mjs';
import ScriptsHtmlWebpackPlugin from '../../plugins/scripts-html-webpack-plugin.mjs';
import ExtendedCspHtmlWebpackPlugin from '../../plugins/extended-csp-html-webpack-plugin.mjs';
import ThrowOnAssetEmitedPlugin from '../../plugins/throw-on-asset-emited-plugin.mjs';
import CreateFilePlugin from '../../plugins/create-file-plugin.mjs';

import csp from '../../../content-security-policy.json' assert { type: 'json' };
import staticwebapp from '../../../staticwebapp.config.template.json' assert { type: 'json' };

/** @typedef { import("postcss-load-config").Config } PostcssConfig */

const buildInfo = new BuildInfo(true);

/** @type {babelPresetEnv.Options | { browserslistEnv: string }} */
const babelPresetEnvOptions = {
  browserslistEnv: 'modern',
  debug: false, // when ThrowOnAssetEmitedWebpackPlugin is thrown for polyfills.*.mjs, set this to true to debug why
  // http://zloirock.github.io/core-js/compat/
  exclude: [
    'web.dom-collections.iterator', // needed for older ios, added when using any for-of, but is not needed if not using for-of on DOM collections, https://github.com/zloirock/core-js/issues/1003
    'es.error.cause', // needed for older ios/safari, newer option that can be used with Error, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
    'es.array.push', // needed for modern browsers, length not properly set for arrays larger than 0x100000000, https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/es.array.push.js
    // needed for older ios/safari, different error is thrown, https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/es.array.push.js
    'es.array.reduce' // chrome 79
  ]
};

/** @type {babelPresetEnv.Options | { browserslistEnv: string }} */
const pixiBabelPresetEnvOptions = {
  browserslistEnv: 'modern',
  debug: false, // when ThrowOnAssetEmitedWebpackPlugin is thrown for polyfills.*.mjs, set this to true to debug why
  // http://zloirock.github.io/core-js/compat/
  exclude: [
    'es.array.push',
    'es.array.reduce',
    'es.array.unshift',
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
    'esnext.typed-array.at',
    'esnext.typed-array.find-last',
    'esnext.typed-array.find-last-index',
    'esnext.typed-array.to-reversed',
    'esnext.typed-array.to-sorted',
    'esnext.typed-array.with',
    'web.dom-collections.iterator',
    'web.dom-exception.stack',
    'web.url',
    'web.url-search-params',
    'web.url-search-params.delete',
    'web.url-search-params.has',
    'web.url-search-params.size'
  ]
};

/** @type {PostcssConfig} */
const postcssOptions = {
  plugins: [
    postcssRemoveCarriageReturn(),
    postcssMergeRules(),
    postcssPresetEnv({
      browsers: browserslistBrowsers('all'),
      features: {
        'nesting-rules': true
      }
    })
  ]
};

/** @type {CspHtmlWebpackPlugin.Policy} */
let cspPolicy;
/** @param {CspHtmlWebpackPlugin.Policy} builtPolicy */
const cspProcessCallback = (builtPolicy) => {
  cspPolicy = builtPolicy;
};
const staticwebappConfig = () => {
  const rootHeaders = staticwebapp.routes.find((route) => route.route === '/').headers;
  rootHeaders['Content-Security-Policy'] = cspPolicy;
  return staticwebapp;
};

/** @type {webpack.Configuration} */
export default {
  name: 'modern',
  dependencies: ['legacy'], // modern must run after legacy, since index.html is done by modern and it has references to legacy output
  target: 'browserslist:modern',
  output: {
    filename: '[name].[contenthash].mjs',
    path: dir.dist,
    publicPath: '',
    scriptType: 'module',
    trustedTypes: 'webpack',
    crossOriginLoading: 'anonymous',
    clean: {
      keep: 'legacy'
    }
  },
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: false, // false adds runtime code to entry chunks, instead of having additional runtime chunks
    splitChunks: {
      chunks: 'all',
      minSize: 0,
      minSizeReduction: 0,
      cacheGroups: cacheGroups
    },
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          module: true
        }
      }),
      new CssMinimizerPlugin()
    ],
    realContentHash: true,
    removeAvailableModules: true,
    sideEffects: true
  },
  experiments: {
    outputModule: false // using modules will force use of import() for loading child scripts, which does not support SRI/integrity
  },
  performance: {
    assetFilter: (assetFilename) => {
      if (minimatch(assetFilename, 'pixi.*.*js')) {
        return false;
      }
      return true;
    }
  },
  module: {
    rules: [
      {
        // used to set sideEffects: false
        test: /\.m?js$/i,
        include: dir.src,
        exclude: [
          path.resolve(dir.src, 'polyfills.mjs'),
          path.resolve(dir.src, 'game', 'pixi.mjs') // needed for @pixi/unsafe-eval
        ],
        sideEffects: false
      },
      {
        test: /\.m?js$/i,
        include: dir.src,
        use: {
          loader: 'babel-loader',
          options: await mergeBabelOptions(babelPresetEnvOptions)
        }
      },
      {
        test: /\.m?js$/i,
        include: path.resolve(dir.node_modules, '@pixi'), // pixi.js v7+ doesn't ship polyfills
        use: {
          loader: 'babel-loader',
          options: await mergeBabelOptions(pixiBabelPresetEnvOptions)
        }
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/inline'
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: postcssOptions
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(dir.src, 'index.html'),
      scriptLoading: 'module'
    }),
    new MoveHtmlWebpackPlugin(),
    new ScriptsHtmlWebpackPlugin({
      add: [
        { path: 'legacy/insights.*.js', directory: dir.dist },
        { path: 'legacy/polyfills.*.js', directory: dir.dist },
        { path: 'legacy/app.*.js', directory: dir.dist }
      ],
      attributes: [
        { path: '**/insights.*.*js', async: true },
        { path: 'legacy/*.js', type: 'nomodule', defer: true, integrity: false }
      ]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    new HtmlInlineCssWebpackPlugin(),
    new SubresourceIntegrityPlugin({
      enabled: 'auto',
      hashFuncNames: ['sha384']
    }),
    new ExtendedCspHtmlWebpackPlugin(csp, {
      hashingMethod: 'sha384',
      hashEnabled: {
        'script-src': false,
        'style-src': true
      },
      nonceEnabled: {
        'script-src': false,
        'style-src': false
      },
      processFn: cspProcessCallback
    }),
    new ThrowOnAssetEmitedPlugin(dir.dist, 'polyfills.*.mjs'), // if an error is thrown by this, enable debug in BabelOptions to check what rules are causing it
    new CopyPlugin({
      patterns: [path.resolve(dir.src, 'favicon.ico')]
    }),
    new CreateFilePlugin(dir.publish, 'staticwebapp.config.json', staticwebappConfig),
    new CreateFilePlugin(dir.dist, 'build/version.json', () => buildInfo.version()),
    new CreateFilePlugin(dir.dist, 'build/browsers.json', () => buildInfo.browsers()),
    new CreateFilePlugin(dir.dist, 'build/sizes.json', () => buildInfo.sizes())
  ]
};