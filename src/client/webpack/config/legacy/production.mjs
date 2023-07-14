import webpack from 'webpack';
import settings from '../../../settings.mjs';

/** @type {webpack.Configuration} */
export default {
  mode: 'production',
  optimization: {
    minimize: true
  },
  plugins: [
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: `"${settings.production.INSTRUMENTATION_KEY}"`
    })
  ]
};
