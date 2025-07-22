/** @typedef {import("../../contract").Container} Contract */
/** @typedef {import("../../contract").Sprite} Sprite */
/** @typedef {import("../../contract").Graphics} Graphics */
/** @typedef {import("./sprite.mjs").default} ImplementationSprite */
/** @typedef {import("./graphics.mjs").default} ImplementationGraphics */

export default class Container {
  #element;
  /** @type { SVGElement? } */ #svg = null;
  #position = { x: 0, y: 0 };
  /** @type { (Sprite | Graphics)[] } */ #items = [];

  constructor() {
    this.#element = document.createElement('div');
    this.#element.style.position = 'absolute';
    this.#element.style.width = 'inherit';
    this.#element.style.height = 'inherit';
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

  /** @type {Contract["items"]} */
  get items() {
    return this.#items;
  }

  /** @type {Contract["move"]} */
  move(x, y) {
    this.#element.style.left = `${x}px`;
    this.#element.style.top = `${y}px`;
    this.#position = { x, y };
  }

  /** @type {Contract["addItem"]} */
  addItem(item) {
    this.#items.push(item);
    const { element } = /** @type {ImplementationSprite | ImplementationGraphics} */ (item);
    if (element.namespaceURI?.match(/svg/)) {
      if (!this.#svg) {
        this.#svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.#svg.style.width = 'inherit';
        this.#svg.style.height = 'inherit';
        this.#element.appendChild(this.#svg);
      }
      this.#svg.appendChild(element);
    } else {
      this.#element.appendChild(element);
    }
  }

  /** @type {Contract["removeItem"]} */
  removeItem(item) {
    const index = this.#items.indexOf(item);
    if (index !== -1) {
      this.#items.splice(index, 1);
    }
    const { element } = /** @type {ImplementationSprite | ImplementationGraphics} */ (item);
    if (element.namespaceURI?.match(/svg/)) {
      this.#svg?.removeChild(element);
    } else {
      this.#element.removeChild(element);
    }
  }
}
