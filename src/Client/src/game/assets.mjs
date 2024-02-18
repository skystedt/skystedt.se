import { BaseTexture, CanvasResource, Texture } from './pixi.mjs';

export default class Assets {
  /**
   * @param {string} url
   * @returns {Promise<Texture>}
   */
  static async loadImage(url) {
    const image = /** @type HTMLImageElement */ (
      await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = reject;
        element.src = url;
      })
    );

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context?.drawImage(image, 0, 0);

    const texture = new Texture(new BaseTexture(new CanvasResource(canvas)));
    return texture;
  }
}
