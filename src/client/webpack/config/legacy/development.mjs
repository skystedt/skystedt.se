import webpack from 'webpack';
import settings from '../../../settings.mjs';

/** @type {webpack.Configuration} */
export default {
  mode: 'development',
  devtool: 'inline-source-map',
  optimization: {
    minimize: false
  },
  plugins: [
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: `"${settings.development.INSTRUMENTATION_KEY}"`
    })
  ]
};
