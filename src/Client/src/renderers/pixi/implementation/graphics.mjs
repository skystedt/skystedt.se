import * as PIXI from '@pixi/graphics';

/** @typedef {import("../../contract").Graphics} Contract */

/** @implements {Contract} */
export default class Graphics extends PIXI.Graphics {
  /** @type {Contract["fillRect"]} */
  fillRect(color, x, y, width, height) {
    this.beginFill(color);
    this.drawRect(x, y, width, height);
    this.endFill();
  }

  /** @type {Contract["move"]} */
  move(x, y) {
    this.position.set(x, y);
  }
}
