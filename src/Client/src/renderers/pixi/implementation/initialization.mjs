import * as PIXI from 'pixi.js';
import Renderer from './renderer.mjs';

/** @typedef {import("../../contract").initializeRenderer} Contract */

const sideEffects = () => {
  // app/init.mjs
  PIXI.extensions.add(PIXI.TickerPlugin);

  // scene/graphics/init.mjs
  PIXI.extensions.add(PIXI.GraphicsPipe);
  PIXI.extensions.add(PIXI.GraphicsContextSystem);
};

/** @type {Contract} */
const initializeRenderer = async () => {
  // @ts-ignore
  // Use unsafe-eval for PIXI to work correctly with CSP
  await import('pixi.js/unsafe-eval');

  sideEffects();

  PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';

  return new Renderer();
};

export default initializeRenderer;
