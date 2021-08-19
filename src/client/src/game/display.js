import { AbsolutePosition, Borders, DisplayPosition, GamePosition, Offset, Size } from './primitives.js';
import * as PIXI from './pixi.js';
/** @typedef { import("./primitives.js").Movement } Movement */

const WIDTH = 380;
const HEIGHT = 200;

export default class Display {
  #renderer;
  #stage;

  #converter;
  #gameSize;
  #displaySize;
  #offset;

  /** @param {PIXI.Renderer | PIXI.AbstractRenderer} renderer, @param {PIXI.Container} stage, @param {HTMLCanvasElement} canvas */
  constructor(renderer, stage, canvas, ignoreBorders = false) {
    this.#renderer = renderer;
    this.#stage = stage;

    this.#converter = new DisplayConverter(this, canvas, ignoreBorders);

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    canvas.addEventListener('contextmenu', event => event.preventDefault());

    this.#gameSize = new Size(WIDTH, HEIGHT);
    this.#displaySize = new Size(WIDTH, HEIGHT);
    this.#offset = new Offset(0, 0);
    this.#resize();

    window.addEventListener('resize', this.#resize.bind(this));
  }

  get convert() { return this.#converter; }

  get gameSize() { return this.#gameSize; }

  get resolution() { return this.#renderer.resolution; }

  get displaySize() { return this.#displaySize; }

  get offset() { return this.#offset; }

  #resize() {
    const previousWidth = this.#displaySize.width;
    const previousHeight = this.#displaySize.height;

    this.#renderer.resolution = this.#calculateResolution();
    this.#displaySize = new Size(Math.floor(window.innerWidth / this.resolution), Math.floor(window.innerHeight / this.resolution));

    this.#renderer.resize(this.#displaySize.width, this.#displaySize.height);

    const offsetX = this.#offset.left + (previousWidth - this.#displaySize.width) / 2;
    const offsetY = this.#offset.top + (previousHeight - this.#displaySize.height) / 2;
    this.#offset = new Offset(offsetX, offsetY);
    this.#stage.position.set(-offsetX, -offsetY);
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
    let displayX = gamePosition.x - this.offset.left + movement.dx;
    let displayY = gamePosition.y - this.offset.top + movement.dy;
    displayX = Display.#clamp(displayX, -allowedOutside.width, this.displaySize.width - objectSize.width + allowedOutside.width);
    displayY = Display.#clamp(displayY, -allowedOutside.height, this.displaySize.height - objectSize.height + allowedOutside.height);
    return new GamePosition(displayX + this.offset.left, displayY + + this.offset.top);
  }
}

class DisplayConverter {
  #display;
  #canvas;
  #ignoreBorders;

  /** @param {Display} display, @param {HTMLCanvasElement} canvas, @param {boolean} ignoreBorders */
  constructor(display, canvas, ignoreBorders) {
    this.#display = display;
    this.#canvas = canvas;
    this.#ignoreBorders = ignoreBorders;
  }

  #borders() {
    if (this.#ignoreBorders) {
      return new Borders(0, 0, 0, 0);
    }
    const style = getComputedStyle(this.#canvas);
    const top = parseInt(style.getPropertyValue('border-top-width'), 10);
    const right = parseInt(style.getPropertyValue('border-right-width'), 10);
    const bottom = parseInt(style.getPropertyValue('border-bottom-width'), 10);
    const left = parseInt(style.getPropertyValue('border-left-width'), 10);
    return new Borders(top, right, bottom, left);
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