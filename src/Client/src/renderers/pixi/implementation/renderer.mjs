import Application from './application.mjs';
import Container from './container.mjs';
import Graphics from './graphics.mjs';
import Sprite from './sprite.mjs';
import Texture from './texture.mjs';

/** @typedef {import("../../contract").Renderer} Contract */

/** @implements {Contract} */
export default class Renderer {
  /** @type {Contract["createApplication"]} */
  createApplication = Application.createApplication;

  /** @type {Contract["createContainer"]} */
  createContainer = () => new Container();

  /** @type {Contract["createTexture"]} */
  createTexture = (source) => Texture.createTexture(source);

  /** @type {Contract["createSprite"]} */
  createSprite = (texture) => new Sprite(texture);

  /** @type {Contract["createGraphics"]} */
  createGraphics = () => new Graphics();
}
