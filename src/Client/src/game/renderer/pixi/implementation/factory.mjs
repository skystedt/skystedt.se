import Application from './application.mjs';
import Container from './container.mjs';
import Graphics from './graphics.mjs';
import Sprite from './sprite.mjs';
import Texture from './texture.mjs';

export default class Factory {
  static initializeApplication = Application.initializeApplication;
  static createContainer = () => new Container();
  static createTexture = Texture.createTexture;
  static createSprite = Sprite.createSprite;
  static createGraphics = () => new Graphics();
}
