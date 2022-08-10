import * as PIXI from './pixi.mjs';
import { GamePosition, Size, Uninitialized } from './primitives.mjs';
import ShipStraightImage from './ship.png';
import ShipLeftImage from './ship_left.png';
import ShipRightImage from './ship_right.png';

const NAME_SHIP_STRAIGHT = 'ship_straight';
const NAME_SHIP_LEFT = 'ship_left';
const NAME_SHIP_RIGHT = 'ship_right';
const TURN_STRAIGHT_DELAY = 10;

/** @enum {number} */
export const ShipDirection = {
  Straight: 0,
  Left: 1,
  Right: 2
};

export default class Ship {
  #container = /** @type {PIXI.Container} */ (Uninitialized);
  #spriteStraight = /** @type {PIXI.Sprite} */ (Uninitialized);
  #spriteLeft = /** @type {PIXI.Sprite} */ (Uninitialized);
  #spriteRight = /** @type {PIXI.Sprite} */ (Uninitialized);
  #startPosition = /** @type {GamePosition} */ (Uninitialized);
  #straightDelay = 0;

  /** @param {PIXI.Loader} loader */
  static addResources(loader) {
    loader
      .add(NAME_SHIP_STRAIGHT, ShipStraightImage)
      .add(NAME_SHIP_LEFT, ShipLeftImage)
      .add(NAME_SHIP_RIGHT, ShipRightImage);
  }

  /**
   * @param {PIXI.utils.Dict<PIXI.LoaderResource>} loaderResources
   * @param {PIXI.Container} stage
   * @param {Size} gameSize
   */
  load(loaderResources, stage, gameSize) {
    const shipStraightTexture = /** @type {PIXI.Texture} */ (loaderResources[NAME_SHIP_STRAIGHT].texture);
    const shipLeftTexture = /** @type {PIXI.Texture} */ (loaderResources[NAME_SHIP_LEFT].texture);
    const shipRightTexture = /** @type {PIXI.Texture} */ (loaderResources[NAME_SHIP_RIGHT].texture);

    this.#spriteStraight = PIXI.Sprite.from(shipStraightTexture);
    this.#spriteLeft = PIXI.Sprite.from(shipLeftTexture);
    this.#spriteRight = PIXI.Sprite.from(shipRightTexture);

    this.#container = new PIXI.Container();
    this.#container.addChild(this.#spriteStraight);
    this.#container.addChild(this.#spriteLeft);
    this.#container.addChild(this.#spriteRight);

    this.#startPosition = new GamePosition(
      (gameSize.width - this.size.width) / 2,
      (gameSize.height - this.size.height) / 2
    );
    this.reset();

    stage.addChild(this.#container);
  }

  get size() {
    return new Size(this.#container.width, this.#container.height);
  }

  get position() {
    return new GamePosition(this.#container.x, this.#container.y);
  }

  /** @param {GamePosition} position */
  set position(position) {
    this.#container.position.set(position.x, position.y);
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
    } else {
      if (this.#straightDelay === 0) {
        this.#spriteStraight.visible = true;
        this.#spriteLeft.visible = false;
        this.#spriteRight.visible = false;
      } else {
        this.#straightDelay--;
      }
    }
  }

  reset() {
    this.direction = ShipDirection.Straight;
    this.position = this.#startPosition;
    this.#straightDelay = 0;
  }
}
