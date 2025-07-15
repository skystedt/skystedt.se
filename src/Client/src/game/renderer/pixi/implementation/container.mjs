import * as PIXI_D from '@pixi/display';
import * as PIXI_G from '@pixi/graphics';
import * as PIXI_S from '@pixi/sprite';

/** @typedef {import("../../contract").Container} Contract */
/** @typedef {import("../../contract").Sprite} Sprite */
/** @typedef {import("../../contract").Graphics} Graphics */

export default class Container extends PIXI_D.Container {
  /** @type { (Sprite | Graphics)[] } */ #elements = [];

  /** @type {Contract["elements"]} */
  get elements() {
    return this.#elements;
  }

  /** @type {Contract["addElement"]} */
  addElement(element) {
    this.#elements.push(element);
    this.addChild(/** @type { PIXI_S.Sprite | PIXI_G.Graphics } */ (/** @type {unknown} */ (element)));
  }

  /** @type {Contract["removeElement"]} */
  // @ts-ignore
  removeElement(element) {
    const index = this.#elements.indexOf(element);
    if (index !== -1) {
      this.#elements.splice(index, 1);
    }
    this.removeChild(/** @type { PIXI_S.Sprite | PIXI_G.Graphics } */ (/** @type {unknown} */ (element)));
  }
}
