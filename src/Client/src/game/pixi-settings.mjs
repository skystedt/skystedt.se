import { BaseTexture, SCALE_MODES } from './pixi.mjs';

import '@pixi/unsafe-eval';

export const pixiSettings = () => {
  BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;
};
