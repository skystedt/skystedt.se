import * as PIXI from '@pixi/app';
import { BaseTexture, SCALE_MODES } from '@pixi/core';
import Display from './display.mjs';

/** @typedef {import("../../contract").Application} Contract */
/** @typedef {import("../../contract").Factory} Factory */

export default class Application extends PIXI.Application {
  /** @type {Factory["initializeApplication"]} */
  static async initializeApplication() {
    BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

    const app = new Application();

    return Promise.resolve(app);
  }

  /** @type {Contract["canvas"]} */
  get canvas() {
    return /** @type {HTMLCanvasElement} */ (this.view);
  }

  /** @type {Contract["display"]} */
  get display() {
    return new Display(this.renderer, this.stage);
  }
}
