import { Size, Uninitialized } from './primitives.mjs';

/** @typedef { import("../renderers/contract").Renderer } Renderer */
/** @typedef { import("../renderers/contract").Application } Application */
/** @typedef { import("../renderers/contract").Container } Container */
/** @typedef { import("../renderers/contract").Graphics } Graphics */

/**
 * @typedef {{
 *   graphics: Graphics,
 *   color: number,
 *   speed: number,
 *   blinking: number
 * }} Star
 */
const BLINK_PROBABILITY = 0.0001;
const BLINK_DURATION = 30;
// prettier-ignore
const SPEED_PROBABILITIES = [
  { speed: 2.00, p: 0.01 },
  { speed: 1.00, p: 0.15 },
  { speed: 0.75, p: 0.25 },
  { speed: 0.50, p: 0.59 }
];

export default class Stars {
  #renderer;
  #container;
  /** @type {Star[]} */ #stars = [];
  #gameSize = /** @type {Size} */ (Uninitialized);

  /**
   * @param {Renderer} renderer
   * @param {Application} application
   */
  constructor(renderer, application) {
    this.#renderer = renderer;
    this.#container = renderer.createContainer();
    application.addContainer(this.#container);
  }

  /**
   * @param {Size} gameSize
   * @param {number} numberOfStars
   */
  load(gameSize, numberOfStars) {
    this.#gameSize = gameSize;
    for (let index = 0; index < numberOfStars; index += 1) {
      const star = this.#newStar();
      this.#stars.push(star);
      this.#container.addItem(star.graphics);
    }
  }

  tick() {
    for (const star of this.#stars) {
      this.#move(star);
    }
  }

  /** @param {Star} star */
  #move(star) {
    star.graphics.move(star.graphics.x, star.graphics.y + star.speed);

    if (star.graphics.y >= this.#gameSize.height) {
      this.#resetStar(star, true);
    }

    if (star.blinking === 1) {
      star.blinking -= 1;
      this.#setGraphicsColor(star.graphics, star.color);
    } else if (star.blinking > 1) {
      star.blinking -= 1;
    } else if (Stars.#random() < BLINK_PROBABILITY) {
      star.blinking = BLINK_DURATION;
      this.#setGraphicsColor(star.graphics, 0x00_00_00);
    }
  }

  /** @returns {Star} */
  #newStar() {
    const graphics = this.#renderer.createGraphics();
    const star = { graphics, color: 0, speed: 0, blinking: 0 };
    this.#resetStar(star, false);
    return star;
  }

  /**
   * @param {Star} star
   * @param {boolean} outside
   */
  #resetStar(star, outside) {
    star.color = this.#randomLightColor();
    this.#setGraphicsColor(star.graphics, star.color);
    const x = Math.floor(Stars.#random() * this.#gameSize.width);
    const y = Math.floor(Stars.#random() * (outside ? -10 : this.#gameSize.height)) - 1;
    star.graphics.move(x, y);
    star.speed = this.#randomSpeed();
  }

  #randomLightColor() {
    const red = Math.floor(Stars.#random() * 80 + 176);
    const blue = Math.floor(Stars.#random() * 80 + 176);
    const green = Math.floor(Stars.#random() * 80 + 176);
    return 0x1_00_00 * red + 0x1_00 * blue + 0x1 * green;
  }

  #randomSpeed() {
    const random = Stars.#random();
    let sum = 0;
    for (const { speed, p } of SPEED_PROBABILITIES) {
      sum += p;
      if (random <= sum) {
        return speed;
      }
    }
    return 1;
  }

  /**
   * @param {Graphics} graphics
   * @param {number} color
   */
  #setGraphicsColor(graphics, color) {
    graphics.clear();
    graphics.fillRect(color, 0, 0, 1, 1);
  }

  /** @returns {number} */
  static #random() {
    // eslint-disable-next-line sonarjs/pseudo-random
    return Math.random();
  }
}
