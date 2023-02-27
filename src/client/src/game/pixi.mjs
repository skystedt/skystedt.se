export * from '@pixi/core';
export * from '@pixi/app';
export * from '@pixi/display';
export * from '@pixi/graphics';
export * from '@pixi/sprite';

import { ShaderSystem, BaseTexture, SCALE_MODES } from '@pixi/core';

import { install } from '@pixi/unsafe-eval';
install({ ShaderSystem });

// Pixelating scaling
BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;
