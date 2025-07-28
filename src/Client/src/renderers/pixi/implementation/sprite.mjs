import * as PIXI from '@pixi/sprite';

/** @typedef {import("../../contract").Sprite} Contract */

/** @implements {Contract} */
export default class Sprite extends PIXI.Sprite {
  /** @type {Contract["move"]} */
  move(x, y) {
    this.position.set(x, y);
  }
}
