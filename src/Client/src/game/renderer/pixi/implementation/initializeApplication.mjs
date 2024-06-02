import { BaseTexture, SCALE_MODES } from '@pixi/core';
import Application from './application.mjs';

import '@pixi/unsafe-eval';

/** @type { import("../../contract").initializeApplication } */
const initializeApplication = async () => {
  BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

  const app = new Application();

  return Promise.resolve(app);
};

export default initializeApplication;
