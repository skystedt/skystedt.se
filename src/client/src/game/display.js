import { AbsolutePosition, Borders, DisplayPosition, GamePosition, Offset, Size } from './primitives.js';
import * as PIXI from './pixi.js';
/** @typedef { import("./primitives.js").Movement } Movement */

const WIDTH = 380;
const HEIGHT = 200;

export default class Display {
  #renderer;
  #stage;
  #canvas;

  #converter;
  #gameSize;
  #displaySize;

  /** @param {PIXI.Renderer | PIXI.AbstractRenderer} renderer, @param {PIXI.Container} stage, @param {HTMLCanvasElement} canvas */
  constructor(renderer, stage, canvas) {
    this.#renderer = renderer;
    this.#stage = stage;
    this.#canvas = canvas;

    this.#converter = new DisplayConverter(this, canvas);

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

    this.#gameSize = new Size(WIDTH, HEIGHT);
    this.#displaySize = new Size(WIDTH, HEIGHT);
    this.#resize();

    window.addEventListener('resize', this.#resize.bind(this));
  }

  get convert() { return this.#converter; }

  get gameSize() { return this.#gameSize; }

  get resolution() { return this.#renderer.resolution; }

  get displaySize() { return this.#displaySize; }

  get offset() { return new Offset(-this.#stage.x, -this.#stage.y); }

  /** @param {Offset} offset */
  set #offset(offset) { this.#stage.position.set(offset.left, offset.top); }

  #resize() {
    const previousWidth = this.#displaySize.width;
    const previousHeight = this.#displaySize.height;

    this.#renderer.resolution = this.#calculateResolution();
    this.#displaySize.width = Math.floor(window.innerWidth / this.resolution);
    this.#displaySize.height = Math.floor(window.innerHeight / this.resolution);

    this.#renderer.resize(this.#displaySize.width, this.#displaySize.height);

    const offsetX = this.#stage.x + (this.#displaySize.width - previousWidth) / 2;
    const offsetY = this.#stage.y + (this.#displaySize.height - previousHeight) / 2;
    this.#offset = new Offset(offsetX, offsetY);
  }

  #calculateResolution() {
    const ratio = Math.max(window.innerWidth / this.gameSize.width, window.innerHeight / this.gameSize.height);
    if (ratio < 1) {
      const scaleDown = 4;
      return Math.max(1 / scaleDown, Math.ceil(ratio * scaleDown) / scaleDown);
    } else {
      return Math.ceil(ratio);
    }
  }

  /** @param {number} value, @param {number} min, @param {number} max */
  static #clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /** @param {GamePosition} gamePosition, @param {Movement} movement, @param {Size} objectSize, @param {Size} allowedOutside */
  restrictGamePositionToDisplay(gamePosition, movement, objectSize, allowedOutside) {
    const displayPosition = this.convert.gameToDisplay(gamePosition);
    const x = Display.#clamp(displayPosition.x + movement.dx, -allowedOutside.width, this.displaySize.width - objectSize.width + allowedOutside.width);
    const y = Display.#clamp(displayPosition.y + movement.dy, -allowedOutside.height, this.displaySize.height - objectSize.height + allowedOutside.height);
    return this.convert.displayToGame(new DisplayPosition(x, y));
  }
}

class DisplayConverter {
  #display;
  #canvas;

  /** @param {Display} display, @param {HTMLCanvasElement} canvas */
  constructor(display, canvas) {
    this.#display = display;
    this.#canvas = canvas;
  }

  #borders() {
    return new Borders(0, 0, 0, 0);
    /*
     * Currently not having any borders
    const style = getComputedStyle(this.#canvas);
    const top = parseInt(style.getPropertyValue('border-top-width'), 10);
    const right = parseInt(style.getPropertyValue('border-right-width'), 10);
    const bottom = parseInt(style.getPropertyValue('border-bottom-width'), 10);
    const left = parseInt(style.getPropertyValue('border-left-width'), 10);
    return new Borders(top, right, bottom, left);
    */
  }

  /** @param {GamePosition} gamePosition */
  gameToDisplay(gamePosition) {
    return new DisplayPosition(gamePosition.x - this.#display.offset.left, gamePosition.y - this.#display.offset.top);
  }

  /** @param {GamePosition} gamePosition */
  gameToAbsolute(gamePosition) {
    return this.displayToAbsolute(this.gameToDisplay(gamePosition));
  }

  /** @param {DisplayPosition} displayPosition */
  displayToGame(displayPosition) {
    return new GamePosition(displayPosition.x + this.#display.offset.left, displayPosition.y + this.#display.offset.top);
  }

  /** @param {DisplayPosition} displayPosition */
  displayToAbsolute(displayPosition) {
    const canvasPosition = this.#canvas.getBoundingClientRect();
    const borders = this.#borders();
    const x = displayPosition.x * this.#display.resolution + canvasPosition.x + borders.left;
    const y = displayPosition.y * this.#display.resolution + canvasPosition.y + borders.top;
    return new AbsolutePosition(x, y);
  }
}