import * as PIXI from 'pixi.js';

/** @typedef {import("../../contract").Container} Contract */

export default class Container extends PIXI.Container {
  /** @type {Contract["addChild"] } */
  // @ts-ignore
  addChild(child) {
    super.addChild(/** @type { PIXI.Sprite | PIXI.Graphics } */ (child));
  }

  /** @type {Contract["removeChild"] } */
  // @ts-ignore
  removeChild(child) {
    super.removeChild(/** @type { PIXI.Sprite | PIXI.Graphics } */ (child));
  }
}
