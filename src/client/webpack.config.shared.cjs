/* eslint-env node */
const path = require('path');
const update = require('immutability-helper');
const browserslist = require('browserslist');
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
const { entry, entryLegacy, splitChunks } = require('./webpack.chunks.cjs');
const { dir, browsers } = require('./webpack.helpers.cjs');
const ScriptsHtmlWebpackPlugin = require('./webpack.helpers.cjs').ScriptsHtmlWebpackPlugin;
const ThrowOnAssetsEmitedWebpackPlugin = require('./webpack.helpers.cjs').ThrowOnAssetsEmitedWebpackPlugin;
const CreateFilePlugin = require('./webpack.helpers.cjs').CreateFilePlugin;
const postcssRemoveCarriageReturn = require('./webpack.helpers.cjs').postcssRemoveCarriageReturn;
const { resolveNestedVersion, mergeBabelRules } = require('./webpack.helpers.cjs');
/** @typedef { import("webpack").Configuration } Configuration */
/** @typedef { import("@babel/preset-env").Options } BabelOptions */
/** @typedef { import("csp-html-webpack-plugin").Policy } CspPolicy */

// https://github.com/zloirock/core-js#babelpreset-env
// "Recommended to specify used minor core-js version"
const corejsVersion = resolveNestedVersion('core-js');

// print the browsers so it's possible to compare browsers between builds without having the dist
// eslint-disable-next-line no-console
console.log('browsers', browsers);

/** @type {CspPolicy} */
let cspPolicy;

/** @returns {Configuration} */
const shared = {
  entry: entry,
  plugins: [], // needs an array for merging
  module: {
    rules: [
      {
        test: /\.m?js$/i,
        include: dir.src,
        exclude: [path.resolve(dir.src, 'polyfills.mjs'), path.resolve(dir.src, 'game', 'pixi.mjs')],
        sideEffects: false
      },
      {
        test: /\.m?js$/i,
        include: dir.src,
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
      minSize: 0,
      minSizeReduction: 0,
      cacheGroups: splitChunks.cacheGroups
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
      processFn: (builtPolicy, htmlPluginData, $, compilation) => {
        cspPolicy = builtPolicy;
        if (compilation.options.mode === 'development') {
          new CspHtmlWebpackPlugin().opts.processFn(builtPolicy, htmlPluginData, $);
        }
      }
    }),
    new ThrowOnAssetsEmitedWebpackPlugin('polyfills.*.mjs'),
    new CopyPlugin({
      patterns: [path.resolve(dir.src, 'favicon.ico')]
    }),
    new CreateFilePlugin(dir.root, 'staticwebapp.config.json', () => {
      const staticwebapp = require('./staticwebapp.config.template.json');
      staticwebapp.routes.find((route) => route.route === '/').headers['Content-Security-Policy'] = cspPolicy;
      return JSON.stringify(staticwebapp, null, 2);
    }),
    new CreateFilePlugin(dir.dist, 'browsers.json', JSON.stringify(browsers, null, 2))
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
            exclude: [
              'web.dom-collections.iterator', // added when using any for-of, but is not needed if not using for-of on DOM collections, https://github.com/zloirock/core-js/issues/1003
              'es.error.cause' // newer option that can be used with Error, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
            ]
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
                    browsers: browserslist(null, { env: 'styles' }),
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
    entry: { $merge: configuration.entry || {}, app: { $merge: configuration.entry?.app || {} } },
    output: { $set: configuration.output },
    experiments: { $set: configuration.experiments },
    plugins: { $push: configuration.plugins || [] },
    module: {
      rules: {
        $apply: (rules) => {
          rules = [...(rules || []), ...(configuration.module.rules || [])];
          mergeBabelRules(rules);
          return rules;
        }
      }
    }
  };
};

const sharedLegacy = update(shared, rules(legacy));
const sharedModern = update(shared, rules(modern));

module.exports = { sharedLegacy, sharedModern };
