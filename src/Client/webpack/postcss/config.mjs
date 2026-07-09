import postcssMergeRules from 'postcss-merge-rules';
import postcssPresetEnv from 'postcss-preset-env';
import { browserslistBrowsers } from '../build-info.mjs';
import postcssRemoveCarriageReturn from './postcss-remove-carriage-return.mjs';

/** @import { Config as PostcssConfig } from 'postcss-load-config' */

/** @type {PostcssConfig} */
// eslint-disable-next-line import-x/prefer-default-export
export const postcssOptions = {
  plugins: [
    postcssRemoveCarriageReturn(),
    postcssMergeRules(),
    postcssPresetEnv({
      browsers: browserslistBrowsers('all'),
      features: {
        'nesting-rules': true
      }
    })
  ]
};
