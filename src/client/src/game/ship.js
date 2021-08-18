import * as PIXI from './pixi.js';
import ShipStraightImage from './ship.png';
import ShipLeftImage from './ship_left.png';
import ShipRightImage from './ship_right.png';

/** @enum {number} */
export const ShipDirection = {
  Straight: 0,
  Left: 1,
  Right: 2,
}

const NAME_SHIP_STRAIGHT = 'ship_straight';
const NAME_SHIP_LEFT = 'ship_left';
const NAME_SHIP_RIGHT = 'ship_right';
const TURN_STRAIGHT_DELAY = 10;

export class Ship {
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

  /** @param {PIXI.utils.Dict<PIXI.LoaderResource>} loaderResources, @param {PIXI.Container} stage, @param {number} gameWidth, @param {number} gameHeight */
  constructor(loaderResources, stage, gameWidth, gameHeight) {
    this.#container = new PIXI.Container();
    this.#spriteStraight = new PIXI.Sprite(loaderResources[NAME_SHIP_STRAIGHT].texture);
    this.#spriteLeft = new PIXI.Sprite(loaderResources[NAME_SHIP_LEFT].texture);
    this.#spriteRight = new PIXI.Sprite(loaderResources[NAME_SHIP_RIGHT].texture);

    this.#container.addChild(this.#spriteStraight);
    this.#container.addChild(this.#spriteLeft);
    this.#container.addChild(this.#spriteRight);

    this.direction = ShipDirection.Straight;
    this.x = (gameWidth - this.width) / 2;
    this.y = (gameHeight - this.height) / 2;
    this.#straightDelay = 0;

    stage.addChild(this.#container);
  }

  get width() { return this.#container.width; }

  get height() { return this.#container.height; }

  get x() { return this.#container.x; }

  get y() { return this.#container.y; }

  set x(x) {
    this.#container.x = x;
  }

  set y(y) {
    this.#container.y = y;
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

  /** @param {number} resolution, @param {HTMLCanvasElement} gameView */
  absoluteCenterPosition(resolution, gameView) {
    const rect = gameView.getBoundingClientRect();
    const style = getComputedStyle(gameView);
    const borderLeft = parseInt(style.getPropertyValue('border-left-width'), 10);
    const borderTop = parseInt(style.getPropertyValue('border-top-width'), 10);

    const x = (this.x + this.width / 2) * resolution + rect.x + borderLeft;
    const y = (this.y + this.height / 2) * resolution + rect.y + borderTop;
    return { x, y };
  }
}