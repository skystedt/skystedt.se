import * as PIXI from './pixi.js';
/** @typedef { import("./primitives.js").Size } Size */

export default class Star extends PIXI.Graphics {
  #gameSize;

  /** @param {PIXI.Container} stage, @param {number} numberOfStars, @param {Size} gameSize */
  static container(stage, numberOfStars, gameSize) {
    const container = new PIXI.Container();
    for (let i = 0; i < numberOfStars; i++) {
      container.addChild(new Star(gameSize));
    }
    stage.addChild(container);
    return container;
  }

  /** @param {Size} gameSize */
  constructor(gameSize) {
    super();
    this.#gameSize = gameSize;

    this.#newColor();
    this.#newX();
    this.#newY();
  }

  #newColor() {
    this.clear();
    this.beginFill(0x10000 * this.#randomColorPart() + 0x100 * this.#randomColorPart() + 0x1 * this.#randomColorPart());
    this.drawRect(0, 0, 1, 1);
    this.endFill();
  }

  #randomColorPart() {
    return Math.floor(Math.random() * 80 + 176);
  }

  #newX() {
    this.x = Math.floor(Math.random() * this.#gameSize.width);
  }

  #newY() {
    this.y = Math.floor(Math.random() * this.#gameSize.height);
  }

  move() {
    this.y++;
    if (this.y >= this.#gameSize.height) {
      this.y = Math.floor(Math.random() * -10) - 1;
      this.#newColor();
      this.#newX();
    }
  }
}