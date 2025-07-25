import { Factory } from '$renderer';
import Assets from './assets.mjs';
import MiniImage from './assets/mini.png';
import { Uninitialized } from './primitives.mjs';

/** @typedef { import("../renderers/contract").Application } Application */
/** @typedef { import("../renderers/contract").Container } Container */
/** @typedef { import("../renderers/contract").Texture } Texture */
/** @typedef { import("../renderers/contract").Sprite } Sprite */

const ALPHA_DELTA = 0.025;
const SHOWN_DURATION = 20;

/** @enum {number} */
const MiniState = {
  Hidden: 0,
  FadeIn: 1,
  Shown: 2,
  FadeOut: 3
};

/** @typedef {{ sprite: Sprite, state: number, wait: number }} Item */

export default class Minis {
  /** @type {Container} */ #container;
  #texture = /** @type {Texture} */ (Uninitialized);

  /** @type {Map<string, Item>} */
  #map = new Map();

  /** @param {Application} application */
  constructor(application) {
    this.#container = Factory.createContainer();
    application.addContainer(this.#container);
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
      sprite.move(x - sprite.width / 2, y - sprite.height / 2);
      sprite.alpha = 0;
      item.state = MiniState.FadeIn;
    }
  }

  /** @param {string} id */
  remove(id) {
    const item = this.#map.get(id);
    if (item) {
      const { sprite } = item;
      this.#container.removeItem(sprite);
      sprite.destroy();
      this.#map.delete(id);
    }
  }

  clear() {
    this.#map.clear();
  }

  tick() {
    Array.from(this.#map.values()).forEach((item) => {
      const { state, wait, alpha } = this.#tickMini(item);
      item.state = state;
      item.wait = wait;
      item.sprite.alpha = alpha;
    });
  }

  /**
   * @param {Item} item
   * @returns {{ state: number, wait: number, alpha: number }}
   */
  #tickMini({ sprite, state, wait }) {
    const { alpha } = sprite;
    // prettier-ignore
    switch (true) {
      case state === MiniState.FadeIn && alpha < 1:             return { state,                    wait,           alpha: Math.min(alpha + ALPHA_DELTA, 1) };
      case state === MiniState.FadeIn:                          return { state: MiniState.Shown,   wait: 0,        alpha };
      case state === MiniState.Shown && wait < SHOWN_DURATION:  return { state,                    wait: wait + 1, alpha };
      case state === MiniState.Shown:                           return { state: MiniState.FadeOut, wait,           alpha };
      case state === MiniState.FadeOut && alpha >= 0:           return { state,                    wait,           alpha: Math.max(alpha - ALPHA_DELTA, 0) };
      case state === MiniState.FadeOut:                         return { state: MiniState.Hidden,  wait,           alpha };
      default:                                                  return { state,                    wait,           alpha };
    }
  }

  /** @returns {Item} */
  #createItem() {
    const sprite = Factory.createSprite(this.#texture);
    sprite.alpha = 0;
    this.#container.addItem(sprite);
    return { sprite, state: MiniState.Hidden, wait: 0 };
  }
}
