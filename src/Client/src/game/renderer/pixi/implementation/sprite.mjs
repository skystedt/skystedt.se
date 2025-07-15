import * as PIXI_C from '@pixi/core';
import * as PIXI_S from '@pixi/sprite';

/** @typedef {import("../../contract").Factory} Factory */

export default class Sprite extends PIXI_S.Sprite {
  /** @type {Factory["createSprite"]} */
  static createSprite = (source) =>
    /** @type {Sprite} */ (PIXI_S.Sprite.from(/** @type {PIXI_C.Texture} */ (/** @type {unknown} */ (source))));
}
