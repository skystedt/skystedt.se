import * as PIXI from 'pixi.js';

/** @typedef {import("../../contract").Factory} Factory */

export default class Texture extends PIXI.Texture {
  /** @type {Factory["createTexture"]} */
  static createTexture(canvas) {
    return /** @type {Texture} */ (
      /** @type {unknown} */ (new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: canvas }) }))
    );
  }
}
