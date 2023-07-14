import webpack from 'webpack';
import ESLintPlugin from 'eslint-webpack-plugin';
import StylelintPlugin from 'stylelint-webpack-plugin';
import { browserslistEnvironment } from '../../utils.mjs';
import settings from '../../../settings.mjs';

/** @type {webpack.Configuration} */
export default {
  mode: 'production',
  optimization: {
    minimize: true
  },
  output: {
    module: true
  },
  plugins: [
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: `"${settings.production.INSTRUMENTATION_KEY}"`
    }),
    new ESLintPlugin({
      extensions: '.mjs',
      failOnError: true,
      failOnWarning: true,
      overrideConfig: {
        rules: {
          'compat/compat': ['warn', browserslistEnvironment('all').config]
        }
      },
      baseConfig: {
        // customize eslint by enforcing prettier (make sure prettier has been used)
        // only for production so to not disrupt development, https://prettier.io/docs/en/integrating-with-linters.html
        // should be last, https://github.com/prettier/eslint-plugin-prettier#recommended-configuration
        extends: ['plugin:prettier/recommended']
      }
    }),
    new StylelintPlugin({
      extensions: '.css',
      failOnError: true,
      failOnWarning: true
    })
  ]
};
