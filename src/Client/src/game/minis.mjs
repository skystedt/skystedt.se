import Assets from './assets.mjs';
import MiniImage from './assets/mini.png';
import { Container, Sprite, Texture } from './pixi.mjs';
import { Uninitialized } from './primitives.mjs';

const ALPHA_DELTA = 0.025;
const SHOWN_DURATION = 20;

/** @enum {number} */
const MiniState = {
  Hidden: 0,
  FadeIn: 1,
  Shown: 2,
  FadeOut: 3
};

/** @typedef {{ sprite: Sprite, state: MiniState, wait: number }} Item */

export default class Minis extends Container {
  #texture = /** @type {Texture} */ (Uninitialized);

  /** @type {Map<string, Item>} */
  #map = new Map();

  /** @param {Container} stage */
  constructor(stage) {
    super();
    stage.addChild(this);
  }

  async load() {
    this.#texture = await Assets.loadImage(MiniImage);
  }

  /** @param {string} id */
  add(id) {
    const item = this.#createItem();
    this.#map.set(id, item);
  }

  /**
   * @param {string} id
   * @param {number} x
   * @param {number} y
   */
  update(id, x, y) {
    const item = this.#map.get(id);
    if (item) {
      const { sprite } = item;
      sprite.position.set(x - sprite.width / 2, y - sprite.height / 2);
      sprite.alpha = 0;
      item.state = MiniState.FadeIn;
    }
  }

  /** @param {string} id */
  remove(id) {
    const item = this.#map.get(id);
    if (item) {
      const { sprite } = item;
      this.removeChild(sprite);
      sprite.destroy();
      this.#map.delete(id);
    }
  }

  clear() {
    this.#map.clear();
  }

  tick() {
    for (const item of this.#map.values()) {
      const { sprite, state } = item;
      switch (state) {
        case MiniState.FadeIn:
          sprite.alpha += ALPHA_DELTA;
          if (sprite.alpha >= 1) {
            item.wait = 0;
            item.state = MiniState.Shown;
          }
          break;

        case MiniState.Shown:
          item.wait += 1;
          if (item.wait >= SHOWN_DURATION) {
            item.state = MiniState.FadeOut;
          }
          break;

        case MiniState.FadeOut:
          sprite.alpha -= ALPHA_DELTA;
          if (sprite.alpha <= 0) {
            item.state = MiniState.Hidden;
          }
          break;
      }
    }
  }

  /** @returns {Item} */
  #createItem() {
    const sprite = /** @type {Sprite} */ (Sprite.from(this.#texture));
    sprite.alpha = 0;
    this.addChild(sprite);
    return { sprite, state: MiniState.Hidden, wait: 0 };
  }
}
