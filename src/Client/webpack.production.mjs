import immutabilityHelper from 'immutability-helper';
import sharedModern from './webpack/config//modern/shared.mjs';
import sharedLegacy from './webpack/config/legacy/shared.mjs';
import productionModern from './webpack/config/modern/production.mjs';
import productionLegacy from './webpack/config/legacy/production.mjs';
import { mergeConfigurationRules } from './webpack/utils.mjs';

const legacy = immutabilityHelper(sharedLegacy, mergeConfigurationRules(productionLegacy));
const modern = immutabilityHelper(sharedModern, mergeConfigurationRules(productionModern));

export default [legacy, modern];
