import Renderer from './renderer.mjs';

/** @import { initializeRenderer as Contract } from '../../contract' */

/** @type {Contract} */
const initializeRenderer = async () => new Renderer();

export default initializeRenderer;
