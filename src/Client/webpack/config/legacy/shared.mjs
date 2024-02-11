import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import { minimatch } from 'minimatch';
import path from 'node:path';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';
import { dir, mergeBabelOptions, printProgress } from '../../utils.mjs';
import cacheGroups from '../chunks.mjs';

/** @type {webpack.Configuration} */
export default {
  name: 'legacy',
  target: 'browserslist:legacy',
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(dir.dist, 'legacy'),
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
      cacheGroups: cacheGroups
    },
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
    realContentHash: true,
    removeAvailableModules: true,
    sideEffects: true
  },
  performance: {
    assetFilter: (/** @type {string} */ assetFilename) => {
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
          options: await mergeBabelOptions({
            browserslistEnv: 'legacy'
          })
        }
      },
      {
        test: /\.m?js$/i,
        include: path.resolve(dir.node_modules, '@pixi'), // pixi.js v7+ doesn't ship polyfills
        use: {
          loader: 'babel-loader',
          options: await mergeBabelOptions({
            browserslistEnv: 'legacy'
          })
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
  plugins: [new webpack.ProgressPlugin(printProgress('legacy'))]
};
