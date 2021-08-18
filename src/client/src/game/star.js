import * as PIXI from './pixi.js';

export default class Star extends PIXI.Graphics {
  #screenWidth;
  #screenHeight;

  /** @param {number} screenWidth, @param {number} screenHeight */
  constructor(screenWidth, screenHeight) {
    super();
    this.#screenWidth = screenWidth;
    this.#screenHeight = screenHeight;

    this.#newColor();
    this.#newX();
    this.#newY();
  }

  /** @param {PIXI.Container} stage, @param {number} numberOfStars, @param {number} screenWidth, @param {number} screenHeight */
  static container(stage, numberOfStars, screenWidth, screenHeight) {
    const container = new PIXI.Container();
    for (let i = 0; i < numberOfStars; i++) {
      container.addChild(new Star(screenWidth, screenHeight));
    }
    stage.addChild(container);
    return container;
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
    this.x = Math.floor(Math.random() * this.#screenWidth);
  }

  #newY() {
    this.y = Math.floor(Math.random() * this.#screenHeight);
  }

  move() {
    this.y++;
    if (this.y >= this.#screenHeight) {
      this.y = Math.floor(Math.random() * -10) - 1;
      this.#newColor();
      this.#newX();
    }
  }
}