import * as PIXI from './pixi.mjs';
import { Uninitialized } from './primitives.mjs';
import Assets from './assets.mjs';
import MiniImage from './assets/mini.png';

const ALPHA_DELTA = 0.025;
const SHOWN_DURATION = 20;

/** @enum {number} */
const MiniState = {
  Hidden: 0,
  FadeIn: 1,
  Shown: 2,
  FadeOut: 3
};

class Sprite extends PIXI.Sprite {
  /** @type {any} */ data;
}

export default class Minis extends PIXI.Container {
  #texture = /** @type {PIXI.Texture} */ (Uninitialized);

  /** @type {Map<string, Sprite>} */
  #map = new Map();

  /** @param {PIXI.Container} stage */
  constructor(stage) {
    super();
    stage.addChild(this);
  }

  async load() {
    this.#texture = /** @type {PIXI.Texture} */ (await Assets.loadImage(MiniImage));
  }

  /** @param {string} id */
  add(id) {
    const sprite = this.#createSprite();
    this.#map.set(id, sprite);
  }

  /**
   * @param {string} id
   * @param {number} x
   * @param {number} y
   */
  update(id, x, y) {
    const sprite = this.#map.get(id);
    if (sprite) {
      sprite.position.set(x - sprite.width / 2, y - sprite.height / 2);
      sprite.alpha = 0;
      sprite.data.state = MiniState.FadeIn;
    }
  }

  /** @param {string} id */
  remove(id) {
    const sprite = this.#map.get(id);
    if (sprite) {
      this.removeChild(sprite);
      sprite.destroy();
      this.#map.delete(id);
    }
  }

  clear() {
    this.#map.clear();
  }

  tick() {
    for (const sprite of this.#map.values()) {
      switch (sprite.data.state) {
        case MiniState.FadeIn:
          sprite.alpha += ALPHA_DELTA;
          if (sprite.alpha >= 1) {
            sprite.data.wait = 0;
            sprite.data.state = MiniState.Shown;
          }
          break;

        case MiniState.Shown:
          sprite.data.wait += 1;
          if (sprite.data.wait >= SHOWN_DURATION) {
            sprite.data.state = MiniState.FadeOut;
          }
          break;

        case MiniState.FadeOut:
          sprite.alpha -= ALPHA_DELTA;
          if (sprite.alpha <= 0) {
            sprite.data.state = MiniState.Hidden;
          }
          break;
      }
    }
  }

  /** @returns {Sprite} */
  #createSprite() {
    const sprite = /** @type {Sprite} */ (PIXI.Sprite.from(this.#texture));
    sprite.data = {};
    sprite.alpha = 0;
    sprite.data.state = MiniState.Hidden;
    this.addChild(sprite);
    return sprite;
  }
}
