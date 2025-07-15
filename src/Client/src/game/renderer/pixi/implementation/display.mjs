import * as PIXI from 'pixi.js';

/** @typedef {import("../../contract").Display} Contract */

export default class Display {
  #viewport;
  #stage;

  /**
   * @param {PIXI.Renderer} viewport
   * @param {PIXI.Container} stage
   */
  constructor(viewport, stage) {
    this.#viewport = viewport;
    this.#stage = stage;
  }

  /** @param {{ x: number; y: number }} value */
  set position(value) {
    this.#stage.position = value;
  }

  get resolution() {
    return this.#viewport.resolution;
  }

  set resolution(value) {
    this.#viewport.resolution = value;
  }

  /** @type {Contract["resize"]} */
  resize(desiredScreenWidth, desiredScreenHeight) {
    this.#viewport.resize(desiredScreenWidth, desiredScreenHeight);
  }

  /** @type {Contract["addContainer"]} */
  addContainer(container) {
    this.#stage.addChild(/** @type {PIXI.Container} */ (/** @type {unknown} */ (container)));
  }
}
