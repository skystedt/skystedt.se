import * as PIXI from 'pixi.js';
import Display from './display.mjs';

/** @typedef {import("../../contract").Application} Contract */
/** @typedef {import("../../contract").Factory} Factory */

export default class Application extends PIXI.Application {
  /** @type {Factory["initializeApplication"]} */
  static async initializeApplication() {
    PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';

    const app = new Application();

    await app.init({
      preference: 'webgpu',
      skipExtensionImports: true
    });

    return app;
  }

  /** @type {Contract["canvas"]} */
  get canvas() {
    return /** @type {HTMLCanvasElement} */ (super.canvas);
  }

  /** @type {Contract["display"]} */
  get display() {
    return new Display(this.renderer, this.stage);
  }
}
