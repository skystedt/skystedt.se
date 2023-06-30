/* eslint-env node */
const path = require('path');
const util = require('util');
const update = require('immutability-helper');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SubresourceIntegrityPlugin = require('webpack-subresource-integrity').SubresourceIntegrityPlugin;
const CspHtmlWebpackPlugin = require('csp-html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlInlineCssWebpackPlugin = require('html-inline-css-webpack-plugin').default;
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const postcssPresetEnv = require('postcss-preset-env');
const postcssMergeRules = require('postcss-merge-rules');
const { entry, entryLegacy, cacheGroups } = require('./webpack.chunks.cjs');
const { dir } = require('./webpack.helpers.cjs');
const ScriptsHtmlWebpackPlugin = require('./webpack.helpers.cjs').ScriptsHtmlWebpackPlugin;
const ThrowOnAssetEmitedWebpackPlugin = require('./webpack.helpers.cjs').ThrowOnAssetEmitedWebpackPlugin;
const CreateFilePlugin = require('./webpack.helpers.cjs').CreateFilePlugin;
const postcssRemoveCarriageReturn = require('./webpack.helpers.cjs').postcssRemoveCarriageReturn;
const {
  resolveNestedVersion,
  resolveBabelTargets,
  fileSizes,
  browserslistEnvironment,
  mergeEntries,
  mergeBabelRules
} = require('./webpack.helpers.cjs');
/** @typedef { import("webpack").Configuration } Configuration */
/** @typedef { import("@babel/preset-env").Options } BabelOptions */
/** @typedef { import("csp-html-webpack-plugin").Policy } CspPolicy */

// https://github.com/zloirock/core-js#babelpreset-env
// "Recommended to specify used minor core-js version"
const corejsVersion = resolveNestedVersion('core-js');

const versionInfo = () => {
  const version = { built: new Date().toISOString().replace('T', ' ').replace('Z', '') };

  // eslint-disable-next-line no-console
  console.log('version', version);

  return version;
};

const browsersInfo = () => {
  const browsers = {
    definitions: {
      global: resolveNestedVersion('browserslist', 'caniuse-lite'),
      webpack: resolveNestedVersion('webpack', 'browserslist', 'caniuse-lite'),
      babel: resolveNestedVersion('@babel/helper-compilation-targets', 'browserslist', 'caniuse-lite'),
      babel_preset_env: resolveNestedVersion('@babel/preset-env', 'browserslist', 'caniuse-lite'),
      postcss: resolveNestedVersion('postcss-preset-env', 'browserslist', 'caniuse-lite')
    },
    browserslist: {
      all: browserslistEnvironment('all').versions,
      modern: browserslistEnvironment('modern').versions,
      legacy: browserslistEnvironment('legacy').versions
    },
    babel: {
      all: resolveBabelTargets('all'),
      modern: resolveBabelTargets('modern'),
      legacy: resolveBabelTargets('legacy')
    }
  };

  // eslint-disable-next-line no-console
  console.log('browsers', util.inspect(browsers, { depth: Infinity, colors: true, compact: 1, breakLength: Infinity }));

  return browsers;
};

const filesInfo = () => {
  const files = fileSizes('*.html', '*.mjs', '*.js');

  // eslint-disable-next-line no-console
  console.log('files', files);

  return files;
};

/** @type {CspPolicy} */
let cspPolicy;

/** @type {Configuration} */
const shared = {
  entry: entry,
  plugins: [], // needs an array for merging
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
        include: [
          dir.src,
          path.resolve(dir.node_modules, '@pixi') // pixi.js v7+ doesn't ship polyfills
        ],
        use: {
          loader: 'babel-loader',
          options: require('./babel.config.json')
        }
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/inline'
      }
    ]
  },
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: false,
    splitChunks: {
      chunks: 'all',
      minSize: 0,
      minSizeReduction: 0,
      cacheGroups: cacheGroups
    },
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
    realContentHash: true,
    removeAvailableModules: true,
    sideEffects: true
  }
};

/** @type {Configuration} */
const modern = {
  name: 'modern',
  dependencies: ['legacy'], // so clean can run correctly
  target: 'browserslist:modern',
  output: {
    filename: '[name].[contenthash].mjs',
    path: dir.dist,
    publicPath: '',
    trustedTypes: 'webpack',
    crossOriginLoading: 'anonymous',
    clean: {
      keep: 'legacy'
    }
  },
  experiments: {
    outputModule: true
  },
  plugins: [
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
        { path: 'legacy/*.js', type: 'nomodule', defer: true }
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
    new CspHtmlWebpackPlugin(require('./content-security-policy.json'), {
      hashingMethod: 'sha384',
      hashEnabled: {
        'script-src': false,
        'style-src': true
      },
      nonceEnabled: {
        'script-src': false,
        'style-src': false
      },
      processFn: (builtPolicy) => {
        cspPolicy = builtPolicy;
      }
    }),
    new ThrowOnAssetEmitedWebpackPlugin('polyfills.*.mjs'), // if an error is thrown by this, enable debug in BabelOptions to check what rules are causing it
    new CopyPlugin({
      patterns: [path.resolve(dir.src, 'favicon.ico')]
    }),
    new CreateFilePlugin(dir.root, 'staticwebapp.config.json', () => {
      const staticwebapp = require('./staticwebapp.config.template.json');
      staticwebapp.routes.find((route) => route.route === '/').headers['Content-Security-Policy'] = cspPolicy;
      return staticwebapp;
    }),
    new CreateFilePlugin(dir.dist, 'build/version.json', versionInfo),
    new CreateFilePlugin(dir.dist, 'build/browsers.json', browsersInfo),
    new CreateFilePlugin(dir.dist, 'build/sizes.json', filesInfo)
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/i,
        use: {
          loader: 'babel-loader',
          options: /** @type {BabelOptions} */ ({
            browserslistEnv: 'modern',
            corejs: corejsVersion,
            bugfixes: true,
            // http://zloirock.github.io/core-js/compat/
            exclude: [
              'web.dom-collections.iterator', // needed for older ios, added when using any for-of, but is not needed if not using for-of on DOM collections, https://github.com/zloirock/core-js/issues/1003
              'es.error.cause', // needed for older ios/safari, newer option that can be used with Error, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
              'es.array.push', // needed for modern browsers, length not properly set for arrays larger than 0x100000000, https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/es.array.push.js
              // needed for older ios/safari, different error is thrown, https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/es.array.push.js

              // Below is from pixi.js
              'es.array.reduce',
              'es.array.unshift',
              'es.string.replace',
              'es.typed-array.*-array',
              'es.typed-array.at',
              'es.typed-array.fill',
              'es.typed-array.find-last',
              'es.typed-array.find-last-index',
              'es.typed-array.set',
              'es.typed-array.sort',
              'es.typed-array.to-reversed',
              'es.typed-array.to-sorted',
              'es.typed-array.with',
              'esnext.typed-array.to-reversed',
              'esnext.typed-array.to-sorted',
              'esnext.typed-array.with',
              'esnext.typed-array.at',
              'esnext.typed-array.find-last',
              'esnext.typed-array.find-last-index',
              'web.dom-exception.stack'
            ],
            debug: false // when ThrowOnAssetEmitedWebpackPlugin is thrown for polyfills.*.mjs, set this to true to debug why
          })
        }
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  postcssRemoveCarriageReturn(),
                  postcssMergeRules(),
                  postcssPresetEnv({
                    browsers: browserslistEnvironment('all').browsers,
                    features: {
                      'nesting-rules': true
                    }
                  })
                ]
              }
            }
          }
        ]
      }
    ]
  }
};

/** @type {Configuration} */
const legacy = {
  name: 'legacy',
  target: 'browserslist:legacy',
  entry: entryLegacy,
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(dir.dist, 'legacy'),
    publicPath: 'legacy/',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.m?js$/i,
        use: {
          loader: 'babel-loader',
          options: /** @type {BabelOptions} */ ({
            browserslistEnv: 'legacy',
            corejs: corejsVersion
          })
        }
      },
      {
        test: /\.css$/i,
        use: 'ignore-loader'
      }
    ]
  }
};

const rules = (configuration) => {
  return {
    name: { $set: configuration.name },
    dependencies: { $set: configuration.dependencies },
    target: { $set: configuration.target },
    entry: { $apply: (entry) => mergeEntries(entry, configuration.entry) },
    output: { $set: configuration.output },
    experiments: { $set: configuration.experiments },
    plugins: { $push: configuration.plugins || [] },
    module: { rules: { $apply: (rules) => mergeBabelRules(rules, configuration.module.rules) } }
  };
};

const sharedLegacy = update(shared, rules(legacy));
const sharedModern = update(shared, rules(modern));

module.exports = { sharedLegacy, sharedModern };
