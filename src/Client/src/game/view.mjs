import { AbsolutePosition, Borders, GamePosition, Movement, Offset, Size, ViewPosition } from './primitives.mjs';

/** @typedef {import("../renderers/contract").Application} Application */

const WIDTH = 380;
const HEIGHT = 200;

export default class View {
  #application;
  #converter;
  #gameSize; // Game is the whole area (not all might be visible)
  #viewSize; // View is a slice of the game of what is visible
  #viewOffset; // Positive values indicates the size outside the view

  /**
   * @param {Application} application
   * @param {HTMLElement} element
   * @param {boolean} ignoreBorders
   */
  constructor(application, element, ignoreBorders = false) {
    this.#application = application;

    this.#converter = new ViewConverter(this, element, ignoreBorders);

    element.addEventListener('contextmenu', (event) => event.preventDefault());

    this.#gameSize = new Size(WIDTH, HEIGHT);
    this.#viewSize = new Size(WIDTH, HEIGHT);
    this.#viewOffset = new Offset(0, 0);
    this.#resize();

    window.addEventListener('resize', this.#resize.bind(this));
  }

  get convert() {
    return this.#converter;
  }

  get gameSize() {
    return this.#gameSize;
  }

  get scale() {
    return this.#application.scale;
  }

  get viewSize() {
    return this.#viewSize;
  }

  get viewOffset() {
    return this.#viewOffset;
  }

  #resize() {
    const previousWidth = this.#viewSize.width;
    const previousHeight = this.#viewSize.height;

    const scale = this.#calculateScale();

    this.#viewSize = new Size(
      Math.floor(window.innerWidth / scale / 2) * 2,
      Math.floor(window.innerHeight / scale / 2) * 2
    );

    this.#application.resize(this.#viewSize.width, this.#viewSize.height, scale);

    // Use previous #viewOffset to keep the game centered
    const offsetX = this.#viewOffset.left + (previousWidth - this.#viewSize.width) / 2;
    const offsetY = this.#viewOffset.top + (previousHeight - this.#viewSize.height) / 2;
    this.#viewOffset = new Offset(offsetX, offsetY);
    this.#application.offset(-offsetX, -offsetY);
  }

  #calculateScale() {
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
    let viewX = gamePosition.x - this.viewOffset.left + movement.dx;
    let viewY = gamePosition.y - this.viewOffset.top + movement.dy;
    viewX = View.#clamp(viewX, 0, this.viewSize.width - objectSize.width);
    viewY = View.#clamp(viewY, 0, this.viewSize.height - objectSize.height);
    return new GamePosition(viewX + this.viewOffset.left, viewY + this.viewOffset.top);
  }
}

/** @private */
class ViewConverter {
  #view;
  #element;
  #ignoreBorders;

  /**
   * @param {View} view
   * @param {HTMLElement} element
   * @param {boolean} ignoreBorders
   */
  constructor(view, element, ignoreBorders) {
    this.#view = view;
    this.#element = element;
    this.#ignoreBorders = ignoreBorders;
  }

  #borders() {
    if (this.#ignoreBorders) {
      return new Borders(0, 0, 0, 0);
    }
    const style = getComputedStyle(this.#element);
    const top = Number.parseInt(style.getPropertyValue('border-top-width'), 10);
    const right = Number.parseInt(style.getPropertyValue('border-right-width'), 10);
    const bottom = Number.parseInt(style.getPropertyValue('border-bottom-width'), 10);
    const left = Number.parseInt(style.getPropertyValue('border-left-width'), 10);
    return new Borders(top, right, bottom, left);
  }

  /**
   * @param {GamePosition} gamePosition
   * @returns {ViewPosition}
   */
  gameToView(gamePosition) {
    return new ViewPosition(gamePosition.x - this.#view.viewOffset.left, gamePosition.y - this.#view.viewOffset.top);
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
    return new GamePosition(viewPosition.x + this.#view.viewOffset.left, viewPosition.y + this.#view.viewOffset.top);
  }

  /**
   * @param {ViewPosition} viewPosition
   * @returns {AbsolutePosition}
   */
  viewToAbsolute(viewPosition) {
    const elementPosition = this.#element.getBoundingClientRect();
    const borders = this.#borders();
    const x = viewPosition.x * this.#view.scale + elementPosition.left + borders.left;
    const y = viewPosition.y * this.#view.scale + elementPosition.top + borders.top;
    return new AbsolutePosition(x, y);
  }
}
