import * as PIXI_C from '@pixi/core';
import * as PIXI_D from '@pixi/display';

/** @typedef {import("../../contract").Display} Contract */

export default class Display {
  #viewport;
  #stage;

  /**
   * @param {PIXI_C.IRenderer<PIXI_C.ICanvas>} viewport
   * @param {PIXI_D.Container} stage
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

  /** @type {Contract["resize"] } */
  resize(desiredScreenWidth, desiredScreenHeight) {
    this.#viewport.resize(desiredScreenWidth, desiredScreenHeight);
  }

  /** @type {Contract["addChild"] } */
  addChild(child) {
    this.#stage.addChild(/** @type { PIXI_D.Container } */ (child));
  }
}
