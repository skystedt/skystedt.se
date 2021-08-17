import * as PIXI from './pixi.js';

const WIDTH = 460;
const HEIGHT = 240;

export default class Display {

  #renderer;

  #calculateResolution() {
    const ratio = Math.min(window.innerWidth / this.width, window.innerHeight / this.height);
    if (ratio < 1) {
      const scaleDown = 4;
      return Math.max(1 / scaleDown, Math.floor(ratio * scaleDown) / scaleDown);
    } else {
      return Math.floor(ratio);
    }
  }

  constructor(renderer) {
    this.#renderer = renderer;

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

    window.addEventListener('resize', this.#resize.bind(this));
    this.#resize();
  }

  #resize() {
    this.#renderer.resolution = this.#calculateResolution();
    this.#renderer.resize(this.width, this.height);
  }

  get width() {
    return WIDTH;
  }

  get height() {
    return HEIGHT;
  }

  get resolution() {
    return this.#renderer.resolution;
  }
}