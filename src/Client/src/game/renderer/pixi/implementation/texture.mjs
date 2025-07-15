import * as PIXI from '@pixi/core';

/** @typedef {import("../../contract").Factory} Factory */

export default class Texture extends PIXI.Texture {
  /** @type {Factory["createTexture"]} */
  static createTexture(canvas) {
    return new PIXI.Texture(new PIXI.BaseTexture(new PIXI.CanvasResource(canvas)));
  }
}
