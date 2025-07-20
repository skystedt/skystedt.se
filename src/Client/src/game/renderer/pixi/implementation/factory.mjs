import Application from './application.mjs';
import Container from './container.mjs';
import Graphics from './graphics.mjs';
import Sprite from './sprite.mjs';
import Texture from './texture.mjs';

/** @typedef {import("../../contract").Factory} Contract */
/** @typedef {import("@pixi/core").Texture} PIXI_Texture */

export default class Factory {
  /** @type {Contract["initializeApplication"]} */
  static initializeApplication = Application.initializeApplication;

  /** @type {Contract["createContainer"]} */
  static createContainer = () => new Container();

  /** @type {Contract["createTexture"]} */
  static createTexture = (canvas) => new Texture(canvas);

  /** @type {Contract["createSprite"]} */
  static createSprite = (texture) => new Sprite(/** @type {PIXI_Texture} */ (texture));

  /** @type {Contract["createGraphics"]} */
  static createGraphics = () => new Graphics();
}
