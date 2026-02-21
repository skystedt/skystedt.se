import * as PIXI from 'pixi.js';
import Renderer from './renderer.mjs';

/** @typedef {import("../../contract").initializeRenderer} Contract */

const sideEffects = () => {
  // Pixi runs initialization code upon import, which is optimized away by tree-shaking
  // We need to add the necessary initialization manually
  // When upgrading Pixi, if something breaks, add any new initialization code here
  // To find what needs to be added, add folders from pixi.js/lib to sideEffects.exclude in chunks.mjs

  // app/init.mjs
  PIXI.extensions.add(PIXI.TickerPlugin);

  // scene/graphics/init.mjs
  PIXI.extensions.add(PIXI.CanvasGraphicsPipe);
  PIXI.extensions.add(PIXI.GraphicsPipe);
  PIXI.extensions.add(PIXI.GraphicsContextSystem);
};

/** @type {Contract} */
const initializeRenderer = async () => {
  // Use unsafe-eval for PIXI to work correctly with CSP
  await import('pixi.js/unsafe-eval');

  sideEffects();

  PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';

  return new Renderer();
};

export default initializeRenderer;
