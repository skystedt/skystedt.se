import { Application, TextureSource } from 'pixi.js';

// https://pixijs.com/8.x/guides/migrations/v8#custom-builds
import 'pixi.js/app';
import 'pixi.js/graphics';
import 'pixi.js/unsafe-eval';

/** @returns {Promise<Application>} */
const Pixi = async () => {
  TextureSource.defaultOptions.scaleMode = 'nearest';

  const app = new Application();

  await app.init({
    preference: 'webgpu',
    manageImports: false
  });

  return app;
};

export default Pixi;
