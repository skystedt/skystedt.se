import { merge } from 'webpack-merge';
import productionLegacy from './webpack/config/legacy/production.mjs';
import sharedLegacy from './webpack/config/legacy/shared.mjs';
import productionModern from './webpack/config/modern/production.mjs';
import sharedModern from './webpack/config/modern/shared.mjs';
import WaitForCompilerPlugin from './webpack/plugins/wait-for-compiler-plugin.mjs';

/** @import { MultiConfiguration } from 'webpack' */

const legacy = merge(sharedLegacy, productionLegacy);
const modern = merge(sharedModern, productionModern);

/** @type {MultiConfiguration} */
export default Object.assign([legacy, modern], {
  plugins: [
    // modern waits for legacy, since index.html is done by modern and it has references to legacy output
    new WaitForCompilerPlugin(modern.name, legacy.name)
  ]
});
