import ESLintPlugin from 'eslint-webpack-plugin';
import path from 'node:path';
import StylelintPlugin from 'stylelint-webpack-plugin';
import webpack from 'webpack';
import settings from '../../../settings.mjs';
import BrowserslistUpdatePlugin from '../../plugins/browserslist-update-plugin.mjs';
import { dir } from '../../utils.mjs';

/** @type {webpack.Configuration} */
export default {
  mode: 'production',
  entry: {
    insights: path.resolve(dir.src, 'insights', 'insights.mjs'),
    app: path.resolve(dir.src, 'index.mjs')
  },
  optimization: {
    minimize: true
  },
  plugins: [
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: `"${settings.production.INSTRUMENTATION_KEY}"`
    }),
    new BrowserslistUpdatePlugin(dir.node_modules, true),
    new ESLintPlugin({
      extensions: ['.mjs'],
      failOnError: true,
      failOnWarning: true,
      overrideConfig: {
        settings: {
          browserslistOpts: { env: 'all-exclude-opera-mini' } // used by eslint-plugin-compat
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
