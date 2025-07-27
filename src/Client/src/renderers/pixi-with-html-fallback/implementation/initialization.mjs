import { initializeRenderer as htmlRenderer } from '../../html/exports.mjs';

/** @typedef {import("../../contract").initializeRenderer} Contract */

/** @type {Contract} */
const initializeRenderer = async () => {
  try {
    // Load the PIXI renderer dynamically
    const pixiRenderer = await import('../../pixi/exports.mjs');
    return await pixiRenderer.initializeRenderer();
  } catch (error) {
    console.error('Failed to initialize PIXI renderer', error);
  }

  // HTML renderer is already bundled/loaded, so we can use static imports
  return await htmlRenderer();
};

export default initializeRenderer;
