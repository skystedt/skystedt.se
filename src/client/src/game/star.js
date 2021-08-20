import * as PIXI from './pixi.js';
import { Uninitialized } from './primitives.js';
/** @typedef { import("./primitives.js").Size } Size */

const BLINK_PROBABILITY = 0.0001
const SPEED_PROBABILITIES = [
  { speed: 2.00, p: 0.01 },
  { speed: 1.00, p: 0.15 },
  { speed: 0.75, p: 0.25 },
  { speed: 0.50, p: 0.59 },
];

export default class Star extends PIXI.Graphics {
  #gameSize;
  #updatesPerSecond;
  #speed = /** @type {number} */ (Uninitialized);
  #blinking = /** @type {number} */ (Uninitialized);
  #originalColor = /** @type {number} */ (Uninitialized);

  /** @param {PIXI.Container} stage, @param {Size} gameSize, @param {number} updatesPerSecond, @param {number} numberOfStars */
  static container(stage, gameSize, updatesPerSecond, numberOfStars) {
    const container = new PIXI.Container();
    for (let i = 0; i < numberOfStars; i++) {
      container.addChild(new Star(gameSize, updatesPerSecond));
    }
    stage.addChild(container);
    return container;
  }

  /** @param {Size} gameSize, @param {number} updatesPerSecond */
  constructor(gameSize, updatesPerSecond) {
    super();
    this.#gameSize = gameSize;
    this.#updatesPerSecond = updatesPerSecond;

    this.#newStar(false);
  }

  /** @param {boolean} outside */
  #newStar(outside) {
    this.#originalColor = this.#randomLightColor();
    this.#setColor(this.#originalColor);
    this.x = Math.floor(Math.random() * this.#gameSize.width);
    this.y = Math.floor(Math.random() * (outside ? -10 : this.#gameSize.height)) - 1;
    this.#speed = this.#randomSpeed();
  }

  #randomLightColor() {
    const red = Math.floor(Math.random() * 80 + 176);
    const blue = Math.floor(Math.random() * 80 + 176);
    const green = Math.floor(Math.random() * 80 + 176);
    return 0x10000 * red + 0x100 * blue + 0x1 * green;
  }

  #randomSpeed() {
    const random = Math.random();
    let p = 0;
    for (const sp of SPEED_PROBABILITIES) {
      p += sp.p;
      if (random < p) {
        return sp.speed;
      }
    }
    return 1;
  }

  /** @param {number} value */
  #setColor(value) {
    this.clear();
    this.beginFill(value);
    this.drawRect(0, 0, 1, 1);
    this.endFill();
  }

  move() {
    this.y += this.#speed;
    if (this.y >= this.#gameSize.height) {
      this.#newStar(true);
    }
    if (this.#blinking == 1) {
      this.#blinking--;
      this.#setColor(this.#originalColor);
    } else if (this.#blinking > 1) {
      this.#blinking--;
    } else if (Math.random() < BLINK_PROBABILITY) {
      this.#blinking = this.#updatesPerSecond;
      this.#setColor(0x000000);
    }
  }
}