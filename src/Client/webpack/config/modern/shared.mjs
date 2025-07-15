// cSpell:ignore staticwebapp, corejs, subresource, caniuse
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import _HtmlInlineCssWebpackPlugin from 'html-inline-css-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { minimatch } from 'minimatch';
import path from 'node:path';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';
import { SubresourceIntegrityPlugin } from 'webpack-subresource-integrity';
import { polyfillCorejs, polyfillCorejsExcluded } from '../../../babel.config.mjs';
import RendererImplementation from '../../../src/renderers/rendererImplementation.mjs';
import BuildInfo from '../../build-info.mjs';
import { dir, rendererPath } from '../../dir.mjs';
import CreateFilePlugin from '../../plugins/create-file-plugin.mjs';
import CspHashesHtmlWebpackPlugin from '../../plugins/html/csp-hashes-html-webpack-plugin.mjs';
import DataUriFaviconHtmlWebpackPlugin from '../../plugins/html/data-uri-favicon-html-webpack-plugin.mjs';
import MoveHookHtmlWebpackPlugin from '../../plugins/html/move-hook-html-webpack-plugin.mjs';
import TagsHtmlWebpackPlugin from '../../plugins/html/tags-html-webpack-plugin.mjs';
import ThrowOnAssetEmittedPlugin from '../../plugins/throw-on-asset-emitted-plugin.mjs';
import ThrowOnNestedPackagePlugin from '../../plugins/throw-on-nested-package.mjs';
import ThrowOnUnnamedChunkPlugin from '../../plugins/throw-on-unnamed-chunk-plugin.mjs';
import { postcssOptions } from '../../postcss/config.mjs';
import { cacheGroups, performanceFilter, sideEffects } from '../chunks.mjs';
import { licenseOptions, licensePreamble, LicenseWebpackPlugin } from '../licenses.mjs';

import csp from '../../../content-security-policy.json' with { type: 'json' };
import staticWebApp from '../../../staticwebapp.config.template.json' with { type: 'json' };

const HtmlInlineCssWebpackPlugin = /** @type {typeof _HtmlInlineCssWebpackPlugin} */ (
  /** @type {any} */ (_HtmlInlineCssWebpackPlugin).default
);

export const buildInfo = new BuildInfo();

/** @typedef {{ [directive: string]: string | string[] }} CspPolicy */
let /** @type {CspPolicy | undefined} */ cspPolicy;
const cspCallback = (/** @type {CspPolicy} */ policy) => {
  cspPolicy = policy;
};
const staticWebAppConfig = () => {
  const rootHeaders = staticWebApp.routes.find((route) => route.route === '/')?.headers;
  if (cspPolicy && rootHeaders) {
    const builtPolicy = CspHashesHtmlWebpackPlugin.buildPolicy(cspPolicy);
    rootHeaders['Content-Security-Policy'] = builtPolicy;
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
      keep: (filename) => minimatch(path.normalize(filename), 'legacy/*')
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
        extractComments: false, // don't extract comments to a separate LICENSE file, license-webpack-plugin handles licenses
        terserOptions: {
          module: true,
          format: {
            comments: false, // don't include comments in the output
            preamble: licensePreamble
          }
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
  resolve: {
    alias: {
      $renderer: rendererPath(RendererImplementation.PixiWithHtmlFallback)
    }
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
          options: {
            browserslistEnv: 'modern',
            plugins: [
              polyfillCorejs({
                exclude: polyfillCorejsExcluded,
                // when ThrowOnAssetEmittedPlugin is thrown for polyfills.*.mjs, set debug to true to find what files/polyfills is causing it
                debug: false
              })
            ]
          }
        }
      },
      {
        test: /\.m?js$/i,
        include: dir.pixi,
        use: {
          // use babel to transform pixi but don't include polyfills (we don't want polyfills in modern)
          loader: 'babel-loader',
          options: {
            browserslistEnv: 'modern',
            plugins: [
              polyfillCorejs({
                shouldInjectPolyfill: () => false
              })
            ]
          }
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
    new LicenseWebpackPlugin(licenseOptions),
    new HtmlWebpackPlugin({
      template: path.resolve(dir.src, 'index.html'),
      favicon: path.resolve(dir.src, 'favicon.ico'),
      scriptLoading: 'module',
      minify: 'auto'
    }),
    new MoveHookHtmlWebpackPlugin(), // Required for CSP
    new TagsHtmlWebpackPlugin({
      files: {
        includeCompiledAssets: true,
        extraFileDirectories: [path.resolve(dir.dist_legacy)]
      },
      tags: [
        {
          path: 'game.*.mjs',
          tag: 'link',
          attributes: { rel: 'modulepreload' }
        },
        {
          path: 'pixi.*.mjs',
          tag: 'link',
          attributes: { rel: 'preload', as: 'script', crossorigin: 'anonymous' } // Don't use webpackPreload/Prefetch, since we don't want webpack to also load it if we add it to the html
        },
        {
          path: 'insights.*.*js',
          tag: 'script',
          attributes: { async: true }
        },
        {
          path: 'legacy/insights.*.js',
          tag: 'script',
          attributes: { nomodule: true, async: true, defer: true, integrity: undefined }
        },
        {
          path: 'legacy/polyfills.*.js',
          tag: 'script',
          attributes: { nomodule: true, defer: true, integrity: undefined }
        },
        {
          path: 'legacy/app.*.js',
          tag: 'script',
          attributes: { nomodule: true, defer: true, integrity: undefined }
        }
      ]
    }),
    new DataUriFaviconHtmlWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    new HtmlInlineCssWebpackPlugin(),
    new SubresourceIntegrityPlugin({
      enabled: 'auto',
      hashFuncNames: ['sha384']
    }),
    new CspHashesHtmlWebpackPlugin(csp, {
      hashAlgorithm: 'sha384',
      metaTag: false, // uses callback to capture CSP and writes it to staticwebapp.config.json
      ignore: {
        externalPatterns: ['legacy/*.js']
      },
      callback: cspCallback
    }),
    new ThrowOnNestedPackagePlugin(dir.node_modules, [
      ['browserslist', 'caniuse-lite'],
      ['webpack', 'browserslist', 'caniuse-lite'],
      ['@babel/helper-compilation-targets', 'browserslist', 'caniuse-lite'],
      ['@babel/preset-env', 'browserslist', 'caniuse-lite'],
      ['postcss-preset-env', 'browserslist', 'caniuse-lite']
    ]),
    new ThrowOnUnnamedChunkPlugin(),
    new ThrowOnAssetEmittedPlugin('polyfills.*.mjs'), // if an error is thrown by this, enable debug in BabelOptions to check what rules are causing it
    new CreateFilePlugin(dir.publish, 'staticwebapp.config.json', staticWebAppConfig),
    new CreateFilePlugin(dir.dist, 'build/version.json', () => buildInfo.version()),
    new CreateFilePlugin(dir.dist, 'build/browsers.json', () => buildInfo.browsers()),
    new CreateFilePlugin(dir.dist, 'build/sizes.json', () => buildInfo.sizes())
  ]
};
