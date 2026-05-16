import { merge } from 'webpack-merge';
import developmentLegacy from './webpack/config/legacy/development.mjs';
import sharedLegacy from './webpack/config/legacy/shared.mjs';
import developmentModern from './webpack/config/modern/development.mjs';
import sharedModern from './webpack/config/modern/shared.mjs';

const legacy = merge(sharedLegacy, developmentLegacy);
const modern = merge(sharedModern, developmentModern);

export default [legacy, modern];
