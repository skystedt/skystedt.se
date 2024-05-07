// cSpell:ignore staticwebapp, subresource, caniuse
/* eslint-disable-line import/default */ import CopyPlugin from 'copy-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import _HtmlInlineCssWebpackPlugin from 'html-inline-css-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'node:path';
import postcssMergeRules from 'postcss-merge-rules';
import postcssPresetEnv from 'postcss-preset-env';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';
import { SubresourceIntegrityPlugin } from 'webpack-subresource-integrity';
import BuildInfo from '../../build-info.mjs';
import CreateFilePlugin from '../../plugins/create-file-plugin.mjs';
import ExtendedCspHtmlWebpackPlugin from '../../plugins/extended-csp-html-webpack-plugin.mjs';
import PostCompilationPrintPlugin from '../../plugins/post-compilation-print-plugin.mjs';
import ScriptsHtmlWebpackPlugin from '../../plugins/scripts-html-webpack-plugin.mjs';
import ThrowOnAssetEmittedPlugin from '../../plugins/throw-on-asset-emitted-plugin.mjs';
import ThrowOnNestedPackagePlugin from '../../plugins/throw-on-nested-package.mjs';
import postcssRemoveCarriageReturn from '../../postcss/postcss-remove-carriage-return.mjs';
import { browserslistBrowsers, dir, mergeBabelOptions, printProgress } from '../../utils.mjs';
import { cacheGroups, performanceFilter, sideEffects } from '../chunks.mjs';
import { babelOptions, pixiBabelOptions } from './babel-options.mjs';

import csp from '../../../content-security-policy.json' with { type: 'json' };
import staticWebApp from '../../../staticwebapp.config.template.json' with { type: 'json' };

const HtmlInlineCssWebpackPlugin = /** @type {typeof _HtmlInlineCssWebpackPlugin} */ (
  /** @type {any} */ (_HtmlInlineCssWebpackPlugin).default
);

/** @typedef { import("postcss-load-config").Config } PostcssConfig */

const buildInfo = new BuildInfo();

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

const nestedPackagesCaniuseLite = [
  ['browserslist', 'caniuse-lite'],
  ['webpack', 'browserslist', 'caniuse-lite'],
  ['@babel/helper-compilation-targets', 'browserslist', 'caniuse-lite'],
  ['@babel/preset-env', 'browserslist', 'caniuse-lite'],
  ['postcss-preset-env', 'browserslist', 'caniuse-lite']
];

/** @type {string} */
let cspPolicy;
const cspProcessCallback = (/** @type {string} */ builtPolicy) => {
  cspPolicy = builtPolicy;
};
const staticWebAppConfig = () => {
  const rootHeaders = staticWebApp.routes.find((route) => route.route === '/')?.headers;
  if (rootHeaders) {
    rootHeaders['Content-Security-Policy'] = String(cspPolicy);
  }
  return staticWebApp;
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
      cacheGroups
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
    assetFilter: performanceFilter
  },
  module: {
    rules: [
      {
        // used to set sideEffects: false
        test: /\.m?js$/i,
        include: sideEffects.include,
        exclude: sideEffects.exclude,
        sideEffects: false
      },
      {
        test: /\.m?js$/i,
        include: dir.src,
        use: {
          loader: 'babel-loader',
          options: await mergeBabelOptions(babelOptions)
        }
      },
      {
        test: /\.m?js$/i,
        include: path.resolve(dir.node_modules, '@pixi'), // pixi.js v7+ doesn't ship polyfills
        use: {
          loader: 'babel-loader',
          options: await mergeBabelOptions(pixiBabelOptions)
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
              postcssOptions
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.ProgressPlugin(printProgress('modern')),
    new HtmlWebpackPlugin({
      template: path.resolve(dir.src, 'index.html'),
      scriptLoading: 'module'
    }),
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
    new ThrowOnNestedPackagePlugin(dir.node_modules, nestedPackagesCaniuseLite),
    new ThrowOnAssetEmittedPlugin('polyfills.*.mjs'), // if an error is thrown by this, enable debug in BabelOptions to check what rules are causing it
    new CopyPlugin({ patterns: [path.resolve(dir.src, 'favicon.ico')] }),
    new CreateFilePlugin(dir.publish, 'staticwebapp.config.json', staticWebAppConfig),
    new CreateFilePlugin(dir.dist, 'build/version.json', () => buildInfo.version()),
    new CreateFilePlugin(dir.dist, 'build/browsers.json', () => buildInfo.browsers()),
    new CreateFilePlugin(dir.dist, 'build/sizes.json', () => buildInfo.sizes()),
    new PostCompilationPrintPlugin(() => buildInfo.resolved)
  ]
};
