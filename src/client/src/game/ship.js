import * as PIXI from './pixi.js';
import { GamePosition, Size } from './primitives.js';
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
  Right: 2,
}

export default class Ship {
  #container;
  #spriteStraight;
  #spriteLeft;
  #spriteRight;
  #straightDelay;

  /** @param {PIXI.Loader} loader */
  static addResources(loader) {
    loader
      .add(NAME_SHIP_STRAIGHT, ShipStraightImage)
      .add(NAME_SHIP_LEFT, ShipLeftImage)
      .add(NAME_SHIP_RIGHT, ShipRightImage);
  }

  /** @param {PIXI.utils.Dict<PIXI.LoaderResource>} loaderResources, @param {PIXI.Container} stage, @param {Size} gameSize */
  constructor(loaderResources, stage, gameSize) {
    this.#container = new PIXI.Container();
    this.#spriteStraight = new PIXI.Sprite(loaderResources[NAME_SHIP_STRAIGHT].texture);
    this.#spriteLeft = new PIXI.Sprite(loaderResources[NAME_SHIP_LEFT].texture);
    this.#spriteRight = new PIXI.Sprite(loaderResources[NAME_SHIP_RIGHT].texture);

    this.#container.addChild(this.#spriteStraight);
    this.#container.addChild(this.#spriteLeft);
    this.#container.addChild(this.#spriteRight);

    this.direction = ShipDirection.Straight;
    this.position = new GamePosition((gameSize.width - this.size.width) / 2, (gameSize.height - this.size.height) / 2);
    this.#straightDelay = 0;

    stage.addChild(this.#container);
  }

  get size() { return new Size(this.#container.width, this.#container.height); }

  get position() { return new GamePosition(this.#container.x, this.#container.y); }

  /** @param {GamePosition} position */
  set position(position) { this.#container.position.set(position.x, position.y); }

  get centerPosition() { return new GamePosition(this.position.x + this.size.width / 2, this.position.y + this.size.height / 2); }

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
}