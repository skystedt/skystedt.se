import * as PIXI from '@pixi/core';

/** @type { import("../../contract").createTexture } */
const createTexture = (canvas) => new PIXI.Texture(new PIXI.BaseTexture(new PIXI.CanvasResource(canvas)));

export default createTexture;
