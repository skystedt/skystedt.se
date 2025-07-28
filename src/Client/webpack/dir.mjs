import path from 'node:path';

/** @typedef {import("../src/renderers/rendererImplementation.mjs").default} RendererImplementation */

const cwd = process.cwd();
export const dir = {
  src: path.resolve(cwd, 'src'),
  publish: path.resolve(cwd, '..', 'publish'),
  dist: path.resolve(cwd, '..', 'publish', 'Client'),
  dist_legacy: path.resolve(cwd, '..', 'publish', 'Client', 'legacy'),
  node_modules: path.resolve(cwd, 'node_modules')
};

/**
 * @param {RendererImplementation} renderer
 * @returns {string}
 */
export const rendererPath = (renderer) => path.resolve(dir.src, 'renderers', renderer, 'exports.mjs');
