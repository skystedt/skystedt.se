import * as PIXI from 'pixi.js';

export default class Texture extends PIXI.Texture {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    super(new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: canvas }) }));
  }
}
