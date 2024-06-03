import { AbsolutePosition, Borders, GamePosition, Movement, Offset, Size, ViewPosition } from './primitives.mjs';

/** @typedef {import("./renderer/contract").Display} Display */

const WIDTH = 380;
const HEIGHT = 200;

export default class View {
  #display;

  #converter;
  #gameSize;
  #viewSize;
  #gameOutsideView;

  /**
   * @param {Display} display
   * @param {HTMLCanvasElement} canvas
   * @param {boolean} ignoreBorders
   */
  constructor(display, canvas, ignoreBorders = false) {
    this.#display = display;

    this.#converter = new ViewConverter(this, canvas, ignoreBorders);

    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    this.#gameSize = new Size(WIDTH, HEIGHT);
    this.#viewSize = new Size(WIDTH, HEIGHT);
    this.#gameOutsideView = new Offset(0, 0);
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
    return this.#display.resolution;
  }

  get viewSize() {
    return this.#viewSize;
  }

  get gameOutsideView() {
    return this.#gameOutsideView;
  }

  #resize() {
    const previousWidth = this.#viewSize.width;
    const previousHeight = this.#viewSize.height;

    this.#display.resolution = this.#calculateResolution();
    this.#viewSize = new Size(
      Math.floor(window.innerWidth / this.resolution / 2) * 2,
      Math.floor(window.innerHeight / this.resolution / 2) * 2
    );

    this.#display.resize(this.#viewSize.width, this.#viewSize.height);

    const offsetX = this.#gameOutsideView.left + (previousWidth - this.#viewSize.width) / 2;
    const offsetY = this.#gameOutsideView.top + (previousHeight - this.#viewSize.height) / 2;
    this.#gameOutsideView = new Offset(offsetX, offsetY);
    this.#display.position = { x: -offsetX, y: -offsetY };
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
  restrictGamePositionToView(gamePosition, movement, objectSize) {
    let viewX = gamePosition.x - this.gameOutsideView.left + movement.dx;
    let viewY = gamePosition.y - this.gameOutsideView.top + movement.dy;
    viewX = View.#clamp(viewX, 0, this.viewSize.width - objectSize.width);
    viewY = View.#clamp(viewY, 0, this.viewSize.height - objectSize.height);
    return new GamePosition(viewX + this.gameOutsideView.left, viewY + this.gameOutsideView.top);
  }
}

/** @private */
class ViewConverter {
  #view;
  #canvas;
  #ignoreBorders;

  /**
   * @param {View} view
   * @param {HTMLCanvasElement} canvas
   * @param {boolean} ignoreBorders
   */
  constructor(view, canvas, ignoreBorders) {
    this.#view = view;
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
   * @returns {ViewPosition}
   */
  gameToView(gamePosition) {
    return new ViewPosition(
      gamePosition.x - this.#view.gameOutsideView.left,
      gamePosition.y - this.#view.gameOutsideView.top
    );
  }

  /**
   * @param {GamePosition} gamePosition
   * @returns {AbsolutePosition}
   */
  gameToAbsolute(gamePosition) {
    return this.viewToAbsolute(this.gameToView(gamePosition));
  }

  /**
   * @param {ViewPosition} viewPosition
   * @returns {GamePosition}
   */
  viewToGame(viewPosition) {
    return new GamePosition(
      viewPosition.x + this.#view.gameOutsideView.left,
      viewPosition.y + this.#view.gameOutsideView.top
    );
  }

  /**
   * @param {ViewPosition} viewPosition
   * @returns {AbsolutePosition}
   */
  viewToAbsolute(viewPosition) {
    const canvasPosition = this.#canvas.getBoundingClientRect();
    const borders = this.#borders();
    const x = viewPosition.x * this.#view.resolution + canvasPosition.left + borders.left;
    const y = viewPosition.y * this.#view.resolution + canvasPosition.top + borders.top;
    return new AbsolutePosition(x, y);
  }
}
