import * as PIXI from 'pixi.js';

/** @typedef {import("../../contract").Graphics} Contract */

/** @implements {Contract} */
export default class Graphics extends PIXI.Graphics {
  /** @type {Contract["fillRect"]} */
  fillRect(color, x, y, width, height) {
    this.rect(x, y, width, height);
    this.fill(color);
  }

  /** @type {Contract["move"]} */
  move(x, y) {
    this.position.set(x, y);
  }
}
