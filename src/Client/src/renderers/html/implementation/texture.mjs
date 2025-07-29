/** @typedef {import("../../contract").Texture} Contract */
/** @typedef {import("../../contract").Renderer} Renderer */

/** @implements {Contract} */
export default class Texture {
  #image;
  #width;
  #height;

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

    const { width, height } = image;
    return new Texture(image, width, height);
  }

  /**
   * @param {HTMLImageElement} image
   * @param {number} width
   * @param {number} height
   */
  constructor(image, width, height) {
    this.#image = image;
    this.#width = width;
    this.#height = height;
  }

  /** @type {Contract["width"]} */
  get width() {
    return this.#width;
  }

  /** @type {Contract["height"]} */
  get height() {
    return this.#height;
  }

  get image() {
    return this.#image;
  }
}
