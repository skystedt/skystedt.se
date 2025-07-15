import { extensions, GraphicsContextSystem, GraphicsPipe, TickerPlugin } from 'pixi.js';

// https://pixijs.com/8.x/guides/migrations/v8#custom-builds

import 'pixi.js/unsafe-eval';

// app/init.mjs
extensions.add(TickerPlugin);

// scene/graphics/init.mjs
extensions.add(GraphicsPipe);
extensions.add(GraphicsContextSystem);
