import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import path from 'node:path';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';
import { dir, mergeBabelPresetEnvOptions } from '../../utils.mjs';
import { cacheGroups, performanceFilter, sideEffects } from '../chunks.mjs';

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
      cacheGroups
    },
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
    realContentHash: true,
    removeAvailableModules: true,
    sideEffects: true
  },
  performance: {
    assetFilter: performanceFilter
  },
  resolve: {
    alias: {
      $renderer: path.resolve(dir.src, 'game/renderer', 'pixi/pixi.mjs')
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
            presets: [
              [
                '@babel/preset-env',
                await mergeBabelPresetEnvOptions({
                  browserslistEnv: 'legacy'
                })
              ]
            ]
          }
        }
      },
      {
        test: /\.m?js$/i,
        include: path.resolve(dir.node_modules, '@pixi'), // pixi.js v7+ doesn't ship polyfills
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                await mergeBabelPresetEnvOptions({
                  browserslistEnv: 'legacy'
                })
              ]
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
        use: 'ignore-loader'
      }
    ]
  },
  plugins: []
};
