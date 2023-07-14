import webpack from 'webpack';
import CspHtmlWebpackPlugin from 'csp-html-webpack-plugin';
import ESLintPlugin from 'eslint-webpack-plugin';
import StylelintPlugin from 'stylelint-webpack-plugin';
import settings from '../../../settings.mjs';
import { dir, browserslistEnvironment } from '../../utils.mjs';

/** @type {webpack.Configuration} */
export default {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    module: false // HMR is not implemented for module chunk format yet
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
    proxy: {
      '/api': 'http://127.0.0.1:8081'
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
          'compat/compat': ['warn', browserslistEnvironment('all').config]
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
  // modify CSP for local development
  builtPolicy = builtPolicy
    .replace('webpack', "webpack 'allow-duplicates' webpack-dev-server#overlay")
    .replace('; report-uri /api/report/csp', '') // Not allowed in <meta> tag
    .replace(
      "; style-src-attr 'none'",
      "; style-src-attr 'unsafe-hashes'" +
        " 'sha256-dKPMtStvhWirlTIky2ozsboS0Q6fEpiYn8PJwiK2ywo='" + // Error overlay
        " 'sha256-9i4CO/Nl+gX45HxIVK0YGg311ZbVCsEZzl4uJ47ZNOo='" + // Error overlay
        " 'sha256-V4C0IT9aeNBiUnxIeGJONTAiAhnmC5iiZqBiYPLqrb0='" + // Error overlay
        " 'sha256-2j+NsrE/qRlmhkADxLdqK0AALIC4Gcc77SVRgwXmYCc='" // Error overlay
    );
  // call default processFn to add <meta> tag
  new CspHtmlWebpackPlugin().opts.processFn(builtPolicy, ...parameters);
};
