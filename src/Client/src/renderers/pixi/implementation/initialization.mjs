import { BaseTexture, SCALE_MODES } from '@pixi/core';
import Renderer from './renderer.mjs';

/** @typedef {import("../../contract").initializeRenderer} Contract */

/** @type {Contract} */
const initializeRenderer = async () => {
  // Use unsafe-eval for PIXI to work correctly with CSP
  await import('@pixi/unsafe-eval');

  BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

  return new Renderer();
};

export default initializeRenderer;
