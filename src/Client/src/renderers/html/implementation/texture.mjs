/** @typedef {import("../../contract").Texture} Contract */

/** @implements {Contract} */
export default class Texture {
  #data;

  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.#data = canvas.toDataURL();
  }

  get data() {
    return this.#data;
  }
}
