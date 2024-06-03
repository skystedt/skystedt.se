import * as PIXI from '@pixi/graphics';

export default class Graphics extends PIXI.Graphics {
  /**
   * @param {number} color
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  fillRect(color, x, y, width, height) {
    this.beginFill(color);
    this.drawRect(x, y, width, height);
    this.endFill();
  }
}
