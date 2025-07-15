import * as PIXI from 'pixi.js';

export default class Graphics extends PIXI.Graphics {
  /**
   * @param {number} color
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  fillRect(color, x, y, width, height) {
    this.rect(x, y, width, height);
    this.fill(color);
  }
}
