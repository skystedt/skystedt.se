import { createTexture } from '$renderer';

/** @typedef { import("./renderer/contract").Texture } Texture */

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

    const texture = createTexture(canvas);
    return texture;
  }
}
