import * as PIXI from '@pixi/core';

/** @typedef {import("../../contract").Texture} Contract */

/** @implements {Contract} */
export default class Texture extends PIXI.Texture {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    super(new PIXI.BaseTexture(new PIXI.CanvasResource(canvas)));
  }
}
