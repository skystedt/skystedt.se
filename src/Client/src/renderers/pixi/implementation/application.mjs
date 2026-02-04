import * as PIXI from 'pixi.js';

/** @typedef {import("../../contract").Application} Contract */
/** @typedef {import("../../contract").Renderer} Renderer */

/** @implements {Contract} */
export default class Application extends PIXI.Application {
  /** @type {Renderer["createApplication"]} */
  static async createApplication() {
    const app = new Application();

    await app.init({
      preference: 'webgpu',
      skipExtensionImports: true
    });

    // ResizePlugin overwrite the resize method, we overwrite it back to the original
    app.resize = Application.prototype.resize.bind(app);

    return app;
  }

  /** @type {Contract["element"]} */
  get element() {
    return this.canvas;
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
    this.renderer.resize(width, height, scale);
  }

  /** @type {Contract["offset"]} */
  offset(left, top) {
    this.stage.position.set(left, top);
  }

  /** @type {Contract["addContainer"]} */
  addContainer(container) {
    this.stage.addChild(/** @type {PIXI.Container} */ (/** @type {unknown} */ (container)));
  }
}
