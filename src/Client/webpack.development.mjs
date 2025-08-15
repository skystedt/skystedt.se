import immutabilityHelper from 'immutability-helper';
import developmentLegacy from './webpack/config/legacy/development.mjs';
import sharedLegacy from './webpack/config/legacy/shared.mjs';
import developmentModern from './webpack/config/modern/development.mjs';
import sharedModern from './webpack/config/modern/shared.mjs';
import { mergeConfigurationRules } from './webpack/utilities.mjs';

const legacy = immutabilityHelper(sharedLegacy, mergeConfigurationRules(developmentLegacy));
const modern = immutabilityHelper(sharedModern, mergeConfigurationRules(developmentModern));

export default [legacy, modern];
