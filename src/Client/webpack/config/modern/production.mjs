import ESLintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import ESLintPlugin from 'eslint-webpack-plugin';
import path from 'node:path';
import StylelintPlugin from 'stylelint-webpack-plugin';
import webpack from 'webpack';
import settings from '../../../settings.mjs';
import { dir } from '../../dir.mjs';
import PostCompilationPrintPlugin from '../../plugins/post-compilation-print-plugin.mjs';
import { printProgress } from '../../utils.mjs';
import { buildInfo } from './shared.mjs';

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
    new webpack.ProgressPlugin(printProgress('modern')),
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: `"${settings.production.INSTRUMENTATION_KEY}"`
    }),
    new ESLintPlugin(
      /** @type {ESLintPlugin.Options} */ ({
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
    }),
    new PostCompilationPrintPlugin(() => buildInfo.resolved)
  ]
};
