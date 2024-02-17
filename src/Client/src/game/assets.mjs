import { Texture } from './pixi.mjs';

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
    const texture = Texture.from(image);
    return texture;
  }
}
