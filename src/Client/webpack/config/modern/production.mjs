import ESLintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import ESLintPlugin from 'eslint-webpack-plugin';
import path from 'node:path';
import StylelintPlugin from 'stylelint-webpack-plugin';
import webpack from 'webpack';
import settings from '../../../settings.mjs';
import { dir } from '../../utils.mjs';

/** @typedef { import("eslint").Linter.FlatConfig } FlatConfig */
/** @typedef { import("eslint-webpack-plugin").Options & { baseConfig: FlatConfig[] } } ESLintPluginOptions */

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
    new ESLintPlugin(
      /** @type {ESLintPluginOptions} */ ({
        configType: 'flat',
        extensions: ['.mjs'],
        failOnError: true,
        failOnWarning: true,
        baseConfig: [
          // customize eslint by enforcing prettier (make sure prettier has been used)
          // only for production so to not disrupt development, https://prettier.io/docs/en/integrating-with-linters.html
          // should be last, https://github.com/prettier/eslint-plugin-prettier#configuration-new-eslintconfigjs
          ESLintPluginPrettierRecommended
        ]
      })
    ),
    new StylelintPlugin({
      extensions: '.css',
      failOnError: true,
      failOnWarning: true
    })
  ]
};
