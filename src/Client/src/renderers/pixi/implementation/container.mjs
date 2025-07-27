import * as PIXI_D from '@pixi/display';
import * as PIXI_G from '@pixi/graphics';
import * as PIXI_S from '@pixi/sprite';

/** @typedef {import("../../contract").Container} Contract */
/** @typedef {import("../../contract").Sprite} Sprite */
/** @typedef {import("../../contract").Graphics} Graphics */

/** @implements {Contract} */
export default class Container extends PIXI_D.Container {
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
    this.addChild(/** @type { PIXI_S.Sprite | PIXI_G.Graphics } */ (/** @type {unknown} */ (item)));
  }

  /** @type {Contract["removeItem"]} */
  removeItem(item) {
    const index = this.#items.indexOf(item);
    if (index !== -1) {
      this.#items.splice(index, 1);
    }
    this.removeChild(/** @type { PIXI_S.Sprite | PIXI_G.Graphics } */ (/** @type {unknown} */ (item)));
  }
}
