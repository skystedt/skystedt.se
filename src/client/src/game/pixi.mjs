/* eslint-disable import/no-duplicates */

// https://pixijs.io/docs/
// https://github.com/pixijs/pixijs/tree/dev/packages

// Based on code generated with https://pixijs.io/customize/

export * from '@pixi/constants';
export * from '@pixi/math';
export * from '@pixi/runner';
export * from '@pixi/settings';
export * from '@pixi/ticker';
import * as utils from '@pixi/utils';
export { utils };
export * from '@pixi/display';
export * from '@pixi/core';
import * as PIXI from '@pixi/core';
import { install } from '@pixi/unsafe-eval';
install(PIXI);
export * from '@pixi/sprite';
export * from '@pixi/app';
export * from '@pixi/graphics';

// Renderer plugins
import { BatchRenderer } from '@pixi/core';

// Application plugins
import { TickerPlugin } from '@pixi/ticker';

PIXI.extensions.add(BatchRenderer, TickerPlugin);

utils.skipHello();
