import * as PIXI from 'pixi.js';
import Application from './application.mjs';

// https://pixijs.com/8.x/guides/migrations/v8#custom-builds
import 'pixi.js/app';
import 'pixi.js/graphics';
import 'pixi.js/unsafe-eval';

/** @type { import("../../contract").initializeApplication } */
const initializeApplication = async () => {
  PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';

  const app = new Application();

  await app.init({
    preference: 'webgpu',
    manageImports: false
  });

  return app;
};

export default initializeApplication;
