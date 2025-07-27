/** @typedef { import("../renderers/contract").Renderer } Renderer */
/** @typedef { import("../renderers/contract").Texture } Texture */

export default class Assets {
  /**
   * @param {Renderer} renderer
   * @param {string} url
   * @returns {Promise<Texture>}
   */
  static async loadImage(renderer, url) {
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

    const texture = renderer.createTexture(canvas);
    return texture;
  }
}
