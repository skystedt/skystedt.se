import * as PIXI_A from '@pixi/app';
import * as PIXI_D from '@pixi/display';

/** @typedef {import("../../contract").Application} Contract */
/** @typedef {import("../../contract").Renderer} Renderer */

/** @implements {Contract} */
export default class Application extends PIXI_A.Application {
  /** @type {Renderer["createApplication"]} */
  static async createApplication() {
    const application = new Application();
    // Patch the resize method to use the class prototype's override
    application.resize = Application.prototype.resize;

    return Promise.resolve(application);
  }

  /** @type {Contract["element"]} */
  get element() {
    return /** @type {HTMLCanvasElement} */ (super.view);
  }

  /** @type {Contract["width"]} */
  get width() {
    return this.renderer.width;
  }

  /** @type {Contract["height"]} */
  get height() {
    return this.renderer.height;
  }

  /** @type {Contract["offsetLeft"]} */
  get offsetLeft() {
    return this.stage.position.x;
  }

  /** @type {Contract["offsetTop"]} */
  get offsetTop() {
    return this.stage.position.y;
  }

  /** @type {Contract["scale"]} */
  get scale() {
    return this.renderer.resolution;
  }

  /** @type {Contract["resize"]} */
  // @ts-ignore
  resize(width, height, scale) {
    this.renderer.resolution = scale;
    this.renderer.resize(width, height);
  }

  /** @type {Contract["offset"]} */
  offset(left, top) {
    this.stage.position.set(left, top);
  }

  /** @type {Contract["addContainer"]} */
  addContainer(container) {
    this.stage.addChild(/** @type {PIXI_D.Container} */ (/** @type {unknown} */ (container)));
  }
}
