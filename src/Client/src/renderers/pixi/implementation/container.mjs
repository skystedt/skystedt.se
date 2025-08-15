import * as PIXI from 'pixi.js';

/** @typedef {import("../../contract").Container} Contract */
/** @typedef {import("../../contract").Sprite} Sprite */
/** @typedef {import("../../contract").Graphics} Graphics */

/** @implements {Contract} */
export default class Container extends PIXI.Container {
  /** @type { (Sprite | Graphics)[] } */ #items = [];

  /** @type {Contract["items"]} */
  get items() {
    return this.#items;
  }

  /** @type {Contract["move"]} */
  move(x, y) {
    this.position.set(x, y);
  }

  /** @type {Contract["addItem"]} */
  addItem(item) {
    this.#items.push(item);
    this.addChild(/** @type { PIXI.Sprite | PIXI.Graphics } */ (/** @type {unknown} */ (item)));
  }

  /** @type {Contract["removeItem"]} */
  removeItem(item) {
    const index = this.#items.indexOf(item);
    if (index !== -1) {
      this.#items.splice(index, 1);
    }
    // eslint-disable-next-line unicorn/prefer-dom-node-remove
    this.removeChild(/** @type { PIXI.Sprite | PIXI.Graphics } */ (/** @type {unknown} */ (item)));
  }
}
