import { merge } from 'webpack-merge';
import developmentLegacy from './webpack/config/legacy/development.mjs';
import sharedLegacy from './webpack/config/legacy/shared.mjs';
import developmentModern from './webpack/config/modern/development.mjs';
import sharedModern from './webpack/config/modern/shared.mjs';
import WaitForCompilerPlugin from './webpack/plugins/wait-for-compiler-plugin.mjs';

/** @import { MultiConfiguration } from 'webpack' */

const legacy = merge(sharedLegacy, developmentLegacy);
const modern = merge(sharedModern, developmentModern);

/** @type {MultiConfiguration} */
export default Object.assign([legacy, modern], {
  plugins: [
    // modern waits for legacy, since index.html is done by modern and it has references to legacy output
    new WaitForCompilerPlugin(modern.name, legacy.name)
  ]
});
