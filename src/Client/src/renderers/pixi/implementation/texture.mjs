import * as PIXI from 'pixi.js';

/** @typedef {import("../../contract").Texture} Contract */
/** @typedef {import("../../contract").Renderer} Renderer */

/** @implements {Contract} */
export default class Texture extends PIXI.Texture {
  /** @type {Renderer["createTexture"]} */
  static async createTexture(src) {
    const image = /** @type HTMLImageElement */ (
      await new Promise((resolve, reject) => {
        const element = document.createElement('img');
        element.onload = () => resolve(element);
        element.onerror = reject;
        element.src = src;
      })
    );

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context?.drawImage(image, 0, 0);

    const textureOptions = /** @type {PIXI.TextureOptions} */ ({ source: new PIXI.CanvasSource({ resource: canvas }) });
    return new Texture(textureOptions);
  }
}
