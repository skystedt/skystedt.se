import { Factory } from '$renderer';
import Assets from './assets.mjs';
import ShipStraightImage from './assets/ship.png';
import ShipLeftImage from './assets/ship_left.png';
import ShipRightImage from './assets/ship_right.png';
import { GamePosition, Size, Uninitialized } from './primitives.mjs';

/** @typedef { import("./renderer/contract").Display } Display */
/** @typedef { import("./renderer/contract").Container } Container */
/** @typedef { import("./renderer/contract").Sprite } Sprite */

const TURN_STRAIGHT_DELAY = 10;

/** @enum {number} */
export const ShipDirection = {
  Straight: 0,
  Left: 1,
  Right: 2
};

export default class Ship {
  /** @type {Container} */ #container;
  #spriteStraight = /** @type {Sprite} */ (Uninitialized);
  #spriteLeft = /** @type {Sprite} */ (Uninitialized);
  #spriteRight = /** @type {Sprite} */ (Uninitialized);
  #startPosition = /** @type {GamePosition} */ (Uninitialized);
  #straightDelay = 0;

  /**
   * @param {Display} display
   */
  constructor(display) {
    this.#container = Factory.createContainer();
    display.addContainer(this.#container);
  }

  /** @param {Size} gameSize */
  async load(gameSize) {
    const shipStraightTexture = await Assets.loadImage(ShipStraightImage);
    const shipLeftTexture = await Assets.loadImage(ShipLeftImage);
    const shipRightTexture = await Assets.loadImage(ShipRightImage);

    this.#spriteStraight = Factory.createSprite(shipStraightTexture);
    this.#spriteLeft = Factory.createSprite(shipLeftTexture);
    this.#spriteRight = Factory.createSprite(shipRightTexture);

    this.#container.addElement(this.#spriteStraight);
    this.#container.addElement(this.#spriteLeft);
    this.#container.addElement(this.#spriteRight);

    this.#startPosition = new GamePosition(
      (gameSize.width - this.size.width) / 2,
      (gameSize.height - this.size.height) / 2
    );
    this.reset();
  }

  get size() {
    return new Size(this.#container.width, this.#container.height);
  }

  get position() {
    return new GamePosition(this.#container.x, this.#container.y);
  }

  /** @param {GamePosition} position */
  set position(position) {
    this.#container.position = { x: position.x, y: position.y };
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
