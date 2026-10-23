import path from 'node:path';
import webpack from 'webpack';
import settings from '../../../settings.mjs';
import { dir } from '../../dir.mjs';
import ColorLoggerPlugin from '../../plugins/color-logger-plugin.mjs';
import ColorProgressPlugin from '../../plugins/color-progress-plugin.mjs';

/** @type {webpack.Configuration} */
export default {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    polyfills: path.resolve(dir.src, 'polyfills.mjs'),
    // dependOn is needed for HMR with multiple entrypoints
    // https://github.com/webpack/webpack-dev-server/issues/2792#issuecomment-1631579320
    insights: { import: path.resolve(dir.src, 'insights', 'insights.mjs'), dependOn: 'polyfills' },
    app: { import: path.resolve(dir.src, 'index.mjs'), dependOn: 'polyfills' }
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: `"${settings.development.INSTRUMENTATION_KEY}"`
    }),
    new ColorLoggerPlugin('legacy', false),
    new ColorProgressPlugin('legacy', false)
  ]
};
