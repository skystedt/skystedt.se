import path from 'node:path';

const cwd = process.cwd();
export const dir = {
  src: path.resolve(cwd, 'src'),
  publish: path.resolve(cwd, '..', 'publish'),
  dist: path.resolve(cwd, '..', 'publish', 'Client'),
  node_modules: path.resolve(cwd, 'node_modules')
};

export const rendererPath = (/** @type {string} */ renderer) =>
  path.resolve(dir.src, 'renderers', renderer, 'renderer.mjs');
