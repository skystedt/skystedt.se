import { Container } from './pixi.mjs';
import { AbsolutePosition, Borders, DisplayPosition, GamePosition, Movement, Offset, Size } from './primitives.mjs';
/** @typedef {import("./pixi.mjs").IRenderer} Renderer */

const WIDTH = 380;
const HEIGHT = 200;

export default class Display {
  #renderer;
  #stage;

  #converter;
  #gameSize;
  #displaySize;
  #gameOutsideDisplay;

  /**
   * @param {Renderer} renderer
   * @param {Container} stage
   * @param {HTMLCanvasElement} canvas
   * @param {boolean} ignoreBorders
   */
  constructor(renderer, stage, canvas, ignoreBorders = false) {
    this.#renderer = renderer;
    this.#stage = stage;

    this.#converter = new DisplayConverter(this, canvas, ignoreBorders);

    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    this.#gameSize = new Size(WIDTH, HEIGHT);
    this.#displaySize = new Size(WIDTH, HEIGHT);
    this.#gameOutsideDisplay = new Offset(0, 0);
    this.#resize();

    window.addEventListener('resize', this.#resize.bind(this));
  }

  get convert() {
    return this.#converter;
  }

  get gameSize() {
    return this.#gameSize;
  }

  get resolution() {
    return this.#renderer.resolution;
  }

  get displaySize() {
    return this.#displaySize;
  }

  get gameOutsideDisplay() {
    return this.#gameOutsideDisplay;
  }

  #resize() {
    const previousWidth = this.#displaySize.width;
    const previousHeight = this.#displaySize.height;

    this.#renderer.resolution = this.#calculateResolution();
    this.#displaySize = new Size(
      Math.floor(window.innerWidth / this.resolution / 2) * 2,
      Math.floor(window.innerHeight / this.resolution / 2) * 2
    );

    this.#renderer.resize(this.#displaySize.width, this.#displaySize.height);

    const offsetX = this.#gameOutsideDisplay.left + (previousWidth - this.#displaySize.width) / 2;
    const offsetY = this.#gameOutsideDisplay.top + (previousHeight - this.#displaySize.height) / 2;
    this.#gameOutsideDisplay = new Offset(offsetX, offsetY);
    this.#stage.position.set(-offsetX, -offsetY);
  }

  #calculateResolution() {
    const ratio = Math.max(window.innerWidth / this.gameSize.width, window.innerHeight / this.gameSize.height);
    if (ratio < 1) {
      const scaleDown = 4;
      return Math.max(1 / scaleDown, Math.ceil(ratio * scaleDown) / scaleDown);
    }
    return Math.ceil(ratio);
  }

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  static #clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * @param {GamePosition} gamePosition
   * @param {Movement} movement
   * @param {Size} objectSize
   * @returns {GamePosition}
   */
  restrictGamePositionToDisplay(gamePosition, movement, objectSize) {
    let displayX = gamePosition.x - this.gameOutsideDisplay.left + movement.dx;
    let displayY = gamePosition.y - this.gameOutsideDisplay.top + movement.dy;
    displayX = Display.#clamp(displayX, 0, this.displaySize.width - objectSize.width);
    displayY = Display.#clamp(displayY, 0, this.displaySize.height - objectSize.height);
    return new GamePosition(displayX + this.gameOutsideDisplay.left, displayY + this.gameOutsideDisplay.top);
  }
}

/** @private */
class DisplayConverter {
  #display;
  #canvas;
  #ignoreBorders;

  /**
   * @param {Display} display
   * @param {HTMLCanvasElement} canvas
   * @param {boolean} ignoreBorders
   */
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

  /**
   * @param {GamePosition} gamePosition
   * @returns {DisplayPosition}
   */
  gameToDisplay(gamePosition) {
    return new DisplayPosition(
      gamePosition.x - this.#display.gameOutsideDisplay.left,
      gamePosition.y - this.#display.gameOutsideDisplay.top
    );
  }

  /**
   * @param {GamePosition} gamePosition
   * @returns {AbsolutePosition}
   */
  gameToAbsolute(gamePosition) {
    return this.displayToAbsolute(this.gameToDisplay(gamePosition));
  }

  /**
   * @param {DisplayPosition} displayPosition
   * @returns {GamePosition}
   */
  displayToGame(displayPosition) {
    return new GamePosition(
      displayPosition.x + this.#display.gameOutsideDisplay.left,
      displayPosition.y + this.#display.gameOutsideDisplay.top
    );
  }

  /**
   * @param {DisplayPosition} displayPosition
   * @returns {AbsolutePosition}
   */
  displayToAbsolute(displayPosition) {
    const canvasPosition = this.#canvas.getBoundingClientRect();
    const borders = this.#borders();
    const x = displayPosition.x * this.#display.resolution + canvasPosition.left + borders.left;
    const y = displayPosition.y * this.#display.resolution + canvasPosition.top + borders.top;
    return new AbsolutePosition(x, y);
  }
}
