import * as PIXI from 'pixi.js';

/** @typedef {import("../../contract").Container} Contract */
/** @typedef {import("../../contract").Sprite} Sprite */
/** @typedef {import("../../contract").Graphics} Graphics */

export default class Container extends PIXI.Container {
  /** @type { (Sprite | Graphics)[] } */ #elements = [];

  /** @type {Contract["elements"]} */
  get elements() {
    return this.#elements;
  }

  /** @type {Contract["addElement"]} */
  addElement(element) {
    this.#elements.push(element);
    this.addChild(/** @type { PIXI.Sprite | PIXI.Graphics } */ (/** @type {unknown} */ (element)));
  }

  /** @type {Contract["removeElement"]} */
  // @ts-ignore
  removeElement(element) {
    const index = this.#elements.indexOf(element);
    if (index !== -1) {
      this.#elements.splice(index, 1);
    }
    this.removeChild(/** @type { PIXI.Sprite | PIXI.Graphics } */ (/** @type {unknown} */ (element)));
  }
}
