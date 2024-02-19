import { BaseTexture, SCALE_MODES } from './pixi.mjs';

import '@pixi/unsafe-eval';

const pixiSettings = () => {
  BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;
};

export default pixiSettings;
