import path from 'node:path';
import webpack from 'webpack';
import settings from '../../../settings.mjs';
import { dir } from '../../utils.mjs';

/** @type {webpack.Configuration} */
export default {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    polyfills: path.resolve(dir.src, 'polyfills.mjs'),
    insights: path.resolve(dir.src, 'insights', 'insights.mjs'),
    app: { import: path.resolve(dir.src, 'index.mjs'), dependOn: 'polyfills' }
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: `"${settings.development.INSTRUMENTATION_KEY}"`
    })
  ]
};
