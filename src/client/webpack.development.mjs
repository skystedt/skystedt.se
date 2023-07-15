import immutabilityHelper from 'immutability-helper';
import sharedModern from './webpack/config/modern/shared.mjs';
import sharedLegacy from './webpack/config/legacy/shared.mjs';
import developmentModern, { cspProcessFn } from './webpack/config/modern/development.mjs';
import developmentLegacy from './webpack/config/legacy/development.mjs';
import { mergeRules as configurationMergeRules } from './webpack/utils.mjs';
import { extendCspPluginProcessFn } from './webpack/plugins/extended-csp-html-webpack-plugin.mjs';

extendCspPluginProcessFn(sharedModern, cspProcessFn);

const legacy = immutabilityHelper(sharedLegacy, configurationMergeRules(developmentLegacy));
const modern = immutabilityHelper(sharedModern, configurationMergeRules(developmentModern));

export default [legacy, modern];
