import CspHtmlWebpackPlugin from 'csp-html-webpack-plugin';
import ESLintPlugin from 'eslint-webpack-plugin';
import path from 'node:path';
import StylelintPlugin from 'stylelint-webpack-plugin';
import webpack from 'webpack';
import settings from '../../../settings.mjs';
import { browserslistConfig, dir } from '../../utils.mjs';

/** @type {webpack.Configuration} */
export default {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    // dependOn is needed for HMR with multiple entrypoints
    // https://github.com/webpack/webpack-dev-server/issues/2792#issuecomment-1631579320
    insights: { import: path.resolve(dir.src, 'insights', 'insights.mjs'), dependOn: 'app' },
    app: path.resolve(dir.src, 'index.mjs')
  },
  optimization: {
    minimize: false
  },
  devServer: {
    static: {
      directory: dir.dist
    },
    server: 'https',
    port: 8080,
    proxy: [
      {
        context: ['/api'],
        target: 'http://127.0.0.1:8081'
      }
    ],
    client: {
      overlay: {
        trustedTypesPolicyName: 'webpack#dev-overlay'
      }
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: `"${settings.development.INSTRUMENTATION_KEY}"`
    }),
    new ESLintPlugin({
      extensions: '.mjs',
      failOnError: false,
      failOnWarning: false,
      overrideConfig: {
        rules: {
          'compat/compat': ['warn', browserslistConfig('all-exclude-opera-mini')]
        }
      }
    }),
    new StylelintPlugin({
      extensions: '.css',
      failOnError: false,
      failOnWarning: false
    })
  ]
};

export const cspProcessFn = (builtPolicy, ...parameters) => {
  const errorOverlay =
    " 'sha256-dKPMtStvhWirlTIky2ozsboS0Q6fEpiYn8PJwiK2ywo='" +
    " 'sha256-9i4CO/Nl+gX45HxIVK0YGg311ZbVCsEZzl4uJ47ZNOo='" +
    " 'sha256-V4C0IT9aeNBiUnxIeGJONTAiAhnmC5iiZqBiYPLqrb0='" +
    " 'sha256-2j+NsrE/qRlmhkADxLdqK0AALIC4Gcc77SVRgwXmYCc='";

  // modify CSP for local development
  builtPolicy = builtPolicy
    .replace('webpack', "webpack 'allow-duplicates' webpack#dev-overlay")
    .replace("'strict-dynamic'", '')
    .replace('; report-uri /api/report/csp', '') // Not allowed in <meta> tag
    .replace("; style-src-attr 'none'", "; style-src-attr 'unsafe-hashes'" + errorOverlay);

  // call default processFn to add <meta> tag
  new CspHtmlWebpackPlugin().opts.processFn(builtPolicy, ...parameters);
};
