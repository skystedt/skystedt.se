import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';
import RendererImplementation from '../../../src/renderers/renderer-implementation.mjs';
import { dir, rendererPath } from '../../dir.mjs';
import LicenseWebpackPluginWrapper from '../../plugins/license-webpack-plugin-wrapper.mjs';
import ThrowOnUnnamedChunkPlugin from '../../plugins/throw-on-unnamed-chunk-plugin.mjs';
import { cacheGroups, performanceFilter, sideEffects } from '../chunks.mjs';
import {
  licenseAcceptable,
  licenseAdditionals,
  licenseFilename,
  licenseFormatter,
  licenseOverrides,
  licensePreamble
} from '../licenses.mjs';

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
      cacheGroups
    },
    minimizer: [
      new TerserPlugin({
        extractComments: false, // don't extract comments to a separate LICENSE file, license-webpack-plugin handles licenses
        terserOptions: {
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
      overrides: licenseOverrides
    }),
    new ThrowOnUnnamedChunkPlugin()
  ]
};
