import * as PIXI from './pixi.mjs';

export default class Assets {
  /**
   * @param {string} url
   * @returns {Promise<PIXI.Texture>}
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
    const texture = PIXI.Texture.from(image);
    return texture;
  }
}
