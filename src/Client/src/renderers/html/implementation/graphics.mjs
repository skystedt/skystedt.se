/** @typedef {import("../../contract").Graphics} Contract */

/** @implements {Contract} */
export default class Graphics {
  #element;
  #position = { x: 0, y: 0 };

  constructor() {
    this.#element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  }

  get element() {
    return this.#element;
  }

  /** @type {Contract["x"]} */
  get x() {
    return this.#position.x;
  }

  /** @type {Contract["y"]} */
  get y() {
    return this.#position.y;
  }

  /** @type {Contract["move"]} */
  move(x, y) {
    this.#position = { x, y };
    this.#element.setAttribute('x', x.toString());
    this.#element.setAttribute('y', y.toString());
  }

  /** @type {Contract["clear"]} */
  clear() {
    this.#element.removeAttribute('x');
    this.#element.removeAttribute('y');
    this.#element.removeAttribute('width');
    this.#element.removeAttribute('height');
    this.#element.removeAttribute('fill');
  }

  /** @type {Contract["fillRect"]} */
  fillRect(color, x, y, width, height) {
    this.#element.setAttribute('x', x.toString());
    this.#element.setAttribute('y', y.toString());
    this.#element.setAttribute('width', width.toString());
    this.#element.setAttribute('height', height.toString());
    this.#element.setAttribute('fill', `#${color.toString(16).padStart(6, '0')}`);
  }
}
