import ESLintPlugin from 'eslint-webpack-plugin';
import path from 'node:path';
import StylelintPlugin from 'stylelint-webpack-plugin';
import webpack from 'webpack';
import settings from '../../../settings.mjs';
import { dir } from '../../dir.mjs';
import BrowserslistUpdatePlugin from '../../plugins/browserslist-update-plugin.mjs';
import ColorProgressPlugin from '../../plugins/color-progress-plugin.mjs';
import AddInlineStylesHtmlWebpackPlugin from '../../plugins/html/add-inline-styles-html-webpack-plugin.mjs';
import CspHashesHtmlWebpackPlugin from '../../plugins/html/csp-hashes-html-webpack-plugin.mjs';
import PostProcessHtmlWebpackPlugin from '../../plugins/html/post-process-html-webpack-plugin.mjs';

import csp from '../../../content-security-policy.json' with { type: 'json' };

/** @typedef { import('webpack-dev-server').Configuration } WebpackDevServerConfiguration */
/** @typedef { Extract<WebpackDevServerConfiguration['client'], object>['overlay'] } WebpackDevServerClientOverlay */

/** @typedef {{ [directive: string]: string | string[] }} CspPolicy */

export const cspCallback = (/** @type {CspPolicy} */ policy) => {
  // modify CSP for local development

  policy['trusted-types'] = ['webpack', "'allow-duplicates'", 'webpack#dev-overlay'];

  policy['script-src'] = [policy['script-src']].flat().filter((src) => src !== "'strict-dynamic'");

  policy['style-src-attr'] = [
    "'unsafe-hashes'",
    // Error overlay
    "'sha256-9i4CO/Nl+gX45HxIVK0YGg311ZbVCsEZzl4uJ47ZNOo='",
    "'sha256-V4C0IT9aeNBiUnxIeGJONTAiAhnmC5iiZqBiYPLqrb0='",
    "'sha256-cI6npbLAYrmkX3bdF4enQmhGkRX5+4yR2pVU4vNmPV8='"
  ];

  return policy;
};

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
      overlay: /** @type {WebpackDevServerClientOverlay} */ ({
        trustedTypesPolicyName: 'webpack#dev-overlay'
      })
    }
  },
  watchOptions: {
    ignored: [dir.node_modules]
  },
  plugins: [
    new webpack.DefinePlugin({
      INSTRUMENTATION_KEY: `"${settings.development.INSTRUMENTATION_KEY}"`
    }),
    new ColorProgressPlugin('modern', false),
    new BrowserslistUpdatePlugin(dir.node_modules),
    // CSP is added again for development, but as a meta tag instead
    new CspHashesHtmlWebpackPlugin(csp, {
      hashAlgorithm: 'sha384',
      metaTag: true,
      ignore: {
        externalPatterns: ['legacy/*.js']
      },
      callback: cspCallback
    }),
    new AddInlineStylesHtmlWebpackPlugin('#webpack-dev-server-client-overlay { pointer-events: auto }'),
    new PostProcessHtmlWebpackPlugin({
      insertNewLines: true,
      headIndentation: ' '.repeat(4)
    }),
    new ESLintPlugin({
      extensions: ['.mjs'],
      failOnError: false,
      failOnWarning: false
    }),
    new StylelintPlugin({
      extensions: '.css',
      failOnError: false,
      failOnWarning: false
    })
  ]
};
