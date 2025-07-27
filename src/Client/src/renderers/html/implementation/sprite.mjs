/** @typedef {import("../../contract").Sprite} Contract */
/** @typedef {import("../../contract").Texture} Texture */
/** @typedef {import("./texture.mjs").default} ImplementationTexture */

/** @implements {Contract} */
export default class Sprite {
  #element;
  #visible = true;
  #size = { width: 0, height: 0 };
  #position = { x: 0, y: 0 };
  #alpha = 1;

  /** @param {Texture} texture */
  constructor(texture) {
    this.#element = document.createElement('img');
    this.#element.src = /** @type {ImplementationTexture} */ (texture).data;
    this.#element.style.position = 'absolute';
  }

  get element() {
    return this.#element;
  }

  /** @type {Contract["visible"]} */
  get visible() {
    return this.#visible;
  }

  /** @type {Contract["visible"]} */
  set visible(value) {
    this.#visible = value;
    this.#element.style.display = value ? 'block' : 'none';
  }

  /** @type {Contract["width"]} */
  get width() {
    return this.#size.width;
  }

  /** @type {Contract["height"]} */
  get height() {
    return this.#size.height;
  }

  /** @type {Contract["x"]} */
  get x() {
    return this.#position.x;
  }

  /** @type {Contract["y"]} */
  get y() {
    return this.#position.y;
  }

  /** @type {Contract["alpha"]} */
  get alpha() {
    return this.#alpha;
  }

  /** @type {Contract["alpha"]} */
  set alpha(value) {
    this.#alpha = value;
    this.#element.style.opacity = value.toString();
  }

  /** @type {Contract["move"]} */
  move(x, y) {
    this.#position = { x, y };
    this.#element.style.left = `${x}px`;
    this.#element.style.top = `${y}px`;
  }

  /** @type {Contract["destroy"]} */
  destroy() {
    this.#element.src = '';
    this.#element.remove();
  }
}
