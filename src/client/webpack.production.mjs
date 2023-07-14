import immutabilityHelper from 'immutability-helper';
import { mergeRules as configurationMergeRules } from './webpack/utils.mjs';
import sharedModern from './webpack/config//modern/shared.mjs';
import sharedLegacy from './webpack/config/legacy/shared.mjs';
import productionModern from './webpack/config/modern/production.mjs';
import productionLegacy from './webpack/config/legacy/production.mjs';

const legacy = immutabilityHelper(sharedLegacy, configurationMergeRules(productionLegacy));
const modern = immutabilityHelper(sharedModern, configurationMergeRules(productionModern));

export default [legacy, modern];
