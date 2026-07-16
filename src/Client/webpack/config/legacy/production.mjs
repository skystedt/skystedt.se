import path from 'node:path';
import webpack from 'webpack';
import settings from '../../../settings.mjs';
import { dir } from '../../dir.mjs';
import ColorLoggerPlugin from '../../plugins/color-logger-plugin.mjs';
import ColorProgressPlugin from '../../plugins/color-progress-plugin.mjs';

/** @type {webpack.Configuration} */
export default {
  mode: 'production',
  entry: {
    polyfills: path.resolve(dir.src, 'polyfills.mjs'),
    insights: path.resolve(dir.src, 'insights', 'insights.mjs'),
    app: { import: path.resolve(dir.src, 'index.mjs'), dependOn: 'polyfills' }
  },
  optimization: {
    minimize: true
  },
  plugins: [
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: `"${settings.production.INSTRUMENTATION_KEY}"`
    }),
    new ColorLoggerPlugin('legacy', true),
    new ColorProgressPlugin('legacy', true)
  ]
};
