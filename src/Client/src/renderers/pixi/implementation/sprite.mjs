import * as PIXI from 'pixi.js';

/** @import { Sprite as Contract } from '../../contract' */

/** @implements {Contract} */
export default class Sprite extends PIXI.Sprite {
  /** @type {Contract["move"]} */
  move(x, y) {
    this.position.set(x, y);
  }
}
