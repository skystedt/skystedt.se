import Renderer from './renderer.mjs';

/** @typedef {import("../../contract").initializeRenderer} Contract */

/** @type {Contract} */
const initializeRenderer = async () => new Renderer();

export default initializeRenderer;
