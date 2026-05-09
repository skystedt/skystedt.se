import MinimizerPlugin from 'minimizer-webpack-plugin';
import webpack from 'webpack';
import RendererImplementation from '../../../src/renderers/renderer-implementation.mjs';
import BuildInfo from '../../build-info.mjs';
import { dir, rendererPath } from '../../dir.mjs';
import LicenseWebpackPluginWrapper from '../../plugins/license-webpack-plugin-wrapper.mjs';
import ThrowOnUnnamedChunkPlugin from '../../plugins/throw-on-unnamed-chunk-plugin.mjs';
import { cacheGroups, performanceFilter, sideEffects, transformPackages } from '../chunks.mjs';
import {
  licenseAcceptable,
  licenseAdditionals,
  licenseFilename,
  licenseFormatter,
  licenseOverrides,
  licensePreamble
} from '../licenses.mjs';

/** @typedef { import("terser").MinifyOptions } TerserMinifyOptions */
/** @typedef { import("cssnano").Options } CssnanoOptions */

/** @type {webpack.Configuration} */
export default {
  name: 'legacy',
  target: 'browserslist:legacy',
  output: {
    filename: '[name].[contenthash].js',
    path: dir.dist_legacy,
    publicPath: 'legacy/',
    clean: true
  },
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: false,
    splitChunks: {
      chunks: 'all',
      minSize: 0,
      minSizeReduction: 0,
      cacheGroups: cacheGroups('legacy')
    },
    minimizer: [
      new MinimizerPlugin({
        test: [/\.m?js$/i, /\.css$/i],
        minify: [MinimizerPlugin.terserMinify, MinimizerPlugin.cssnanoMinify],
        extractComments: false, // don't extract comments to a separate LICENSE file, license-webpack-plugin handles licenses
        minimizerOptions: [
          /** @type {TerserMinifyOptions} */
          ({
            /* terser */
            module: false,
            format: {
              comments: false, // don't include comments in the output
              preamble: licensePreamble
            }
          }),
          /** @type {CssnanoOptions} */
          ({
            /* cssnano */
            preset: 'default'
          })
        ]
      })
    ],
    realContentHash: true,
    removeAvailableModules: true,
    sideEffects: true
  },
  performance: {
    assetFilter: performanceFilter
  },
  resolve: {
    alias: {
      $renderer: rendererPath(RendererImplementation.Html)
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
            browserslistEnv: 'legacy'
          }
        }
      },
      {
        test: /\.m?js$/i,
        include: transformPackages,
        use: {
          loader: 'babel-loader',
          options: {
            browserslistEnv: 'legacy'
          }
        }
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/inline'
      },
      {
        test: /\.css$/i,
        use: 'ignore-loader'
      }
    ]
  },
  plugins: [
    new LicenseWebpackPluginWrapper({
      nodeModulesDirectory: dir.node_modules,
      filename: licenseFilename,
      acceptableLicenses: licenseAcceptable.redistributed,
      formatter: licenseFormatter,
      additionals: licenseAdditionals.legacy,
      overrides: licenseOverrides,
      callback: (name, version, licenseId) => {
        BuildInfo.instance.addLicense('redistributed', name, version, licenseId);
      }
    }),
    new ThrowOnUnnamedChunkPlugin()
  ]
};
