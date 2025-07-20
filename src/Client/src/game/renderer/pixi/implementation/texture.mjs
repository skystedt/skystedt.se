import * as PIXI from '@pixi/core';

export default class Texture extends PIXI.Texture {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    super(new PIXI.BaseTexture(new PIXI.CanvasResource(canvas)));
  }
}
