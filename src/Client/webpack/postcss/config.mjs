import postcssMergeRules from 'postcss-merge-rules';
import postcssPresetEnv from 'postcss-preset-env';
import { browserslistBrowsers } from '../utils.mjs';
import postcssRemoveCarriageReturn from './postcss-remove-carriage-return.mjs';

/** @typedef { import("postcss-load-config").Config } PostcssConfig */

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
