import * as PIXI from 'pixi.js';

/** @typedef {import("../../contract").Factory} Factory */

export default class Sprite extends PIXI.Sprite {
  /** @type {Factory["createSprite"]} */
  static createSprite = (source) =>
    /** @type {Sprite} */ (PIXI.Sprite.from(/** @type {PIXI.Texture} */ (/** @type {unknown} */ (source))));
}
