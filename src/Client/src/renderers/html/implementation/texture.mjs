/** @typedef {import("../../contract").Texture} Contract */
/** @typedef {import("../../contract").Renderer} Renderer */

/** @implements {Contract} */
export default class Texture {
  #image;
  #width;
  #height;

  /** @type {Renderer["createTexture"]} */
  static async createTexture(source) {
    const image = /** @type HTMLImageElement */ (
      await new Promise((resolve, reject) => {
        const element = document.createElement('img');
        // eslint-disable-next-line unicorn/prefer-add-event-listener
        element.onload = () => resolve(element);
        // eslint-disable-next-line unicorn/prefer-add-event-listener
        element.onerror = reject;
        element.src = source;
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
