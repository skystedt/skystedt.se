export * from '@pixi/app';
export * from '@pixi/core';
export * from '@pixi/display';
export * from '@pixi/graphics';
export * from '@pixi/sprite';

import '@pixi/unsafe-eval';

import { BaseTexture, SCALE_MODES } from '@pixi/core';

// Pixelating scaling
BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;
