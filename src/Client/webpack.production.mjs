import { merge } from 'webpack-merge';
import productionLegacy from './webpack/config/legacy/production.mjs';
import sharedLegacy from './webpack/config/legacy/shared.mjs';
import productionModern from './webpack/config/modern/production.mjs';
import sharedModern from './webpack/config/modern/shared.mjs';

const legacy = merge(sharedLegacy, productionLegacy);
const modern = merge(sharedModern, productionModern);

export default [legacy, modern];
