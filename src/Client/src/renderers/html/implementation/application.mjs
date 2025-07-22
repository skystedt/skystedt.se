/** @typedef {import("../../contract").Application} Contract */
/** @typedef {import("../../contract").Factory} Factory */
/** @typedef {import("./container.mjs").default} ImplementationContainer */

export default class Application {
  #elementOuter;
  #elementOffset;
  #size = { width: 0, height: 0 };
  #scale = 1;
  #offset = { left: 0, top: 0 };

  /** @type {Factory["initializeApplication"]} */
  static async initializeApplication() {
    const app = new Application();
    return Promise.resolve(app);
  }

  constructor() {
    this.#elementOuter = document.createElement('div');
    this.#elementOuter.style.position = 'relative';
    this.#elementOuter.style.overflow = 'hidden';
    this.#elementOffset = document.createElement('div');
    this.#elementOffset.style.position = 'absolute';
    this.#elementOuter.appendChild(this.#elementOffset);
  }

  /** @type {Contract["element"]} */
  get element() {
    return this.#elementOuter;
  }

  /** @type {Contract["width"]} */
  get width() {
    return this.#size.width;
  }

  /** @type {Contract["height"]} */
  get height() {
    return this.#size.height;
  }

  /** @type {Contract["offsetLeft"]} */
  get offsetLeft() {
    return this.#offset.left;
  }

  /** @type {Contract["offsetTop"]} */
  get offsetTop() {
    return this.#offset.top;
  }

  /** @type {Contract["scale"]} */
  get scale() {
    return this.#scale;
  }

  /** @type {Contract["ticker"]} */
  get ticker() {
    return { FPS: 0 };
  }

  /** @type {Contract["resize"]} */
  resize(width, height, scale) {
    this.#size = { width, height };
    this.#scale = scale;
    this.#elementOuter.style.width = `${width}px`;
    this.#elementOuter.style.height = `${height}px`;
    this.#elementOuter.style.transform = `scale(${scale})`;
    this.#elementOffset.style.width = `${width - 2 * this.#offset.left}px`;
    this.#elementOffset.style.height = `${height - 2 * this.#offset.top}px`;
  }

  /** @type {Contract["offset"]} */
  offset(left, top) {
    this.#offset = { left, top };
    this.#elementOffset.style.left = `${left}px`;
    this.#elementOffset.style.top = `${top}px`;
    this.#elementOffset.style.width = `${this.#size.width - 2 * left}px`;
    this.#elementOffset.style.height = `${this.#size.height - 2 * top}px`;
  }

  /** @type {Contract["addContainer"]} */
  addContainer(container) {
    this.#elementOffset.appendChild(/** @type {ImplementationContainer} */ (container).element);
  }
}
