import ShipStraightImage from './assets/ship.png';
import ShipLeftImage from './assets/ship_left.png';
import ShipRightImage from './assets/ship_right.png';
import { GamePosition, Size, Uninitialized } from './primitives.mjs';

/** @typedef { import("../renderers/contract").Renderer } Renderer */
/** @typedef { import("../renderers/contract").Application } Application */
/** @typedef { import("../renderers/contract").Container } Container */
/** @typedef { import("../renderers/contract").Sprite } Sprite */

const TURN_STRAIGHT_DELAY = 10;

/** @enum {number} */
export const ShipDirection = {
  Straight: 0,
  Left: 1,
  Right: 2
};

export default class Ship {
  #renderer;
  #container;
  #spriteStraight = /** @type {Sprite} */ (Uninitialized);
  #spriteLeft = /** @type {Sprite} */ (Uninitialized);
  #spriteRight = /** @type {Sprite} */ (Uninitialized);
  #startPosition = /** @type {GamePosition} */ (Uninitialized);
  #straightDelay = 0;

  /**
   * @param {Renderer} renderer
   * @param {Application} application
   */
  constructor(renderer, application) {
    this.#renderer = renderer;
    this.#container = renderer.createContainer();
    application.addContainer(this.#container);
  }

  /** @param {GamePosition} position */
  async load(position) {
    const [shipStraightTexture, shipLeftTexture, shipRightTexture] = await Promise.all([
      this.#renderer.createTexture(ShipStraightImage),
      this.#renderer.createTexture(ShipLeftImage),
      this.#renderer.createTexture(ShipRightImage)
    ]);

    this.#spriteStraight = this.#renderer.createSprite(shipStraightTexture);
    this.#spriteLeft = this.#renderer.createSprite(shipLeftTexture);
    this.#spriteRight = this.#renderer.createSprite(shipRightTexture);

    this.#startPosition = new GamePosition(
      position.x - this.#spriteStraight.width / 2,
      position.y - this.#spriteStraight.height / 2
    );
    this.reset();

    this.#container.addItem(this.#spriteStraight);
    this.#container.addItem(this.#spriteLeft);
    this.#container.addItem(this.#spriteRight);
  }

  get size() {
    return new Size(this.#spriteStraight.width, this.#spriteStraight.height);
  }

  get position() {
    return new GamePosition(this.#container.x, this.#container.y);
  }

  /** @param {GamePosition} position */
  set position(position) {
    this.#container.move(position.x, position.y);
  }

  get centerPosition() {
    return new GamePosition(this.position.x + this.size.width / 2, this.position.y + this.size.height / 2);
  }

  /** @param {ShipDirection} direction */
  set direction(direction) {
    if (direction === ShipDirection.Left) {
      this.#spriteStraight.visible = false;
      this.#spriteLeft.visible = true;
      this.#spriteRight.visible = false;
      this.#straightDelay = TURN_STRAIGHT_DELAY;
    } else if (direction === ShipDirection.Right) {
      this.#spriteStraight.visible = false;
      this.#spriteLeft.visible = false;
      this.#spriteRight.visible = true;
      this.#straightDelay = TURN_STRAIGHT_DELAY;
    } else if (this.#straightDelay === 0) {
      this.#spriteStraight.visible = true;
      this.#spriteLeft.visible = false;
      this.#spriteRight.visible = false;
    } else {
      this.#straightDelay -= 1;
    }
  }

  reset() {
    this.direction = ShipDirection.Straight;
    this.position = this.#startPosition;
    this.#straightDelay = 0;
  }
}
