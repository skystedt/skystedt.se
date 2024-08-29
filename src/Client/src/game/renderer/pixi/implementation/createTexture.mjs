import * as PIXI from 'pixi.js';

/** @type { import("../../contract").createTexture } */
const createTexture = (canvas) => new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: canvas }) });

export default createTexture;
