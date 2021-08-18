import * as PIXI from './pixi.js';
import ShipImage from './ship.png';
import ShipLeftImage from './ship_left.png';
import ShipRightImage from './ship_right.png';

/** @enum {number} */
export const ShipDirection = {
  Normal: 0,
  Left: 1,
  Right: 2,
}

const NAME_SHIP_NORMAL = 'ship_normal';
const NAME_SHIP_LEFT = 'ship_left';
const NAME_SHIP_RIGHT = 'ship_right';
const TURN_NORMAL_DELAY = 10;

export class Ship {
  #container;
  #spriteNormal;
  #spriteLeft;
  #spriteRight;
  #normalDelay = 0;

  /** @param {PIXI.Loader} loader */
  static addResources(loader) {
    loader
      .add(NAME_SHIP_NORMAL, ShipImage)
      .add(NAME_SHIP_LEFT, ShipLeftImage)
      .add(NAME_SHIP_RIGHT, ShipRightImage);
  }

  /** @param {PIXI.utils.Dict<PIXI.LoaderResource>} loaderResources, @param {PIXI.Container} stage, @param {number} gameWidth, @param {number} gameHeight */
  constructor(loaderResources, stage, gameWidth, gameHeight) {
    this.#container = new PIXI.Container();
    this.#spriteNormal = new PIXI.Sprite(loaderResources[NAME_SHIP_NORMAL].texture);
    this.#spriteLeft = new PIXI.Sprite(loaderResources[NAME_SHIP_LEFT].texture);
    this.#spriteRight = new PIXI.Sprite(loaderResources[NAME_SHIP_RIGHT].texture);

    this.#container.addChild(this.#spriteNormal);
    this.#container.addChild(this.#spriteLeft);
    this.#container.addChild(this.#spriteRight);

    this.direction = ShipDirection.Normal;
    this.x = (gameWidth - this.width) / 2;
    this.y = (gameHeight - this.height) / 2;

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
      this.#spriteNormal.visible = false;
      this.#spriteLeft.visible = true;
      this.#spriteRight.visible = false;
      this.#normalDelay = TURN_NORMAL_DELAY;
    } else if (direction === ShipDirection.Right) {
      this.#spriteNormal.visible = false;
      this.#spriteLeft.visible = false;
      this.#spriteRight.visible = true;
      this.#normalDelay = TURN_NORMAL_DELAY;
    } else {
      if (this.#normalDelay === 0) {
        this.#spriteNormal.visible = true;
        this.#spriteLeft.visible = false;
        this.#spriteRight.visible = false;
      } else {
        this.#normalDelay--;
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