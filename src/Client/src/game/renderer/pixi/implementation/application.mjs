import * as PIXI from '@pixi/app';
import Display from './display.mjs';

/** @typedef {import("../../contract").Application} Contract */

export default class Application extends PIXI.Application {
  /** @type {Contract["canvas"] } */
  get canvas() {
    return /** @type {HTMLCanvasElement} */ (super.view);
  }

  /** @type {Contract["display"] } */
  get display() {
    return new Display(this.renderer, this.stage);
  }
}
