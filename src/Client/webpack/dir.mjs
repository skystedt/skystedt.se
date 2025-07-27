import path from 'node:path';

const cwd = process.cwd();
export const dir = {
  src: path.resolve(cwd, 'src'),
  publish: path.resolve(cwd, '..', 'publish'),
  dist: path.resolve(cwd, '..', 'publish', 'Client'),
  dist_legacy: path.resolve(cwd, '..', 'publish', 'Client', 'legacy'),
  node_modules: path.resolve(cwd, 'node_modules')
};

/** @enum {string} */
export const Renderer = {
  Pixi: 'pixi',
  HTML: 'html'
};

/**
 * @param {Renderer} renderer
 * @returns {string}
 */
export const rendererPath = (renderer) => path.resolve(dir.src, 'renderers', renderer, 'renderer.mjs');
