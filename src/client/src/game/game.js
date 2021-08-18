import * as PIXI from './pixi.js';
import Display from './display.js';
import Input from './input.js';
import { Ship, ShipDirection } from './ship.js';
import Star from './star.js';

const LOGIC_FPS = 100;
const BACKGROUND_FPS = 30;

const STARS = 100;

export default class Game {
  #app;
  #display;
  #input;
  #loopState = { lowFpsCheck: 0, logicWait: 0, logicRemaining: 0, backgroundWait: 0, backgroundRemaining: 0, lastTimestamp: 0 };

  /** @type {PIXI.Container} */
  #stars = (/** @type {unknown} */(null));
  /** @type {Ship} */
  #ship = (/** @type {unknown} */(null));

  get canvas() { return this.#app.view; }

  /** @param {string} id */
  constructor(id) {
    this.#app = new PIXI.Application();
    this.#app.view.id = id;
    this.#display = new Display(this.#app.renderer);
    this.#input = new Input();

    Ship.addResources(this.#app.loader);
    this.#app.loader.load(this.#initialize.bind(this));
  }

  #initialize() {
    try {
      this.#stars = Star.container(this.#app.stage, STARS, this.#display.width, this.#display.height);
      this.#ship = new Ship(this.#app.loader.resources, this.#app.stage, this.#display.width, this.#display.height);
      this.#startFrameLoop();
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  #startFrameLoop() {
    this.#loopState.logicWait = 1000 / LOGIC_FPS;
    this.#loopState.logicRemaining = 0;
    this.#loopState.backgroundWait = 1000 / BACKGROUND_FPS;
    this.#loopState.backgroundRemaining = 0;
    this.#loopState.lastTimestamp = performance.now();
    this.#loopState.lowFpsCheck = this.#loopState.lastTimestamp + 1000;
    requestAnimationFrame(this.#frameLoop.bind(this));
  }

  /** @param {DOMHighResTimeStamp} timestamp */
  #frameLoop(timestamp) {
    requestAnimationFrame(this.#frameLoop.bind(this));

    const elapsed = timestamp - this.#loopState.lastTimestamp;
    this.#loopState.lastTimestamp = timestamp;

    if (elapsed < 0) {
      // can happen for the first iteration when there is other queued calls to requestAnimationFrame
      console.warn('timestamp in the past', elapsed);
      return;
    }

    let logicTicks;
    let backgroundTick;

    if (elapsed >= 200) { // if inactive or lag, don't process all missing time at once
      logicTicks = 1;
      this.#loopState.logicRemaining = 0;

      backgroundTick = true;
      this.#loopState.backgroundRemaining = 0;
    } else {
      logicTicks = Math.floor((this.#loopState.logicRemaining + elapsed) / this.#loopState.logicWait);
      this.#loopState.logicRemaining += elapsed - logicTicks * this.#loopState.logicWait;

      backgroundTick = this.#loopState.backgroundRemaining > this.#loopState.backgroundWait;
      this.#loopState.backgroundRemaining += elapsed - (backgroundTick ? this.#loopState.backgroundWait : 0);
    }

    while (logicTicks--) {
      this.#updateLogic();
    }

    if (backgroundTick) {
      this.#updateBackground();
    }

    if (this.#loopState.lowFpsCheck && timestamp > this.#loopState.lowFpsCheck) {
      this.#loopState.lowFpsCheck = 0;
      const fps = Math.round(this.#app.ticker.FPS);
      if (fps < LOGIC_FPS) {
        console.warn(`Low FPS (target: ${LOGIC_FPS}): ${fps}`);
      }
    }
  }

  #updateLogic() {
    const shipPosition = this.#ship.absoluteCenterPosition(this.#display.resolution, this.#app.view);
    const direction = this.#input.direction(this.#display.resolution, shipPosition.x, shipPosition.y);
    this.#ship.x = Math.max(-1, Math.min(this.#ship.x + direction.dx, this.#display.width - this.#ship.width + 1));
    this.#ship.y = Math.max(0, Math.min(this.#ship.y + direction.dy, this.#display.height - this.#ship.height));
    if (direction.dx < 0) {
      this.#ship.direction = ShipDirection.Left;
    } else if (direction.dx > 0) {
      this.#ship.direction = ShipDirection.Right;
    } else {
      this.#ship.direction = ShipDirection.Normal;
    }
  }

  #updateBackground() {
    for (const star of this.#stars.children) {
      /** @type {Star} */
      (star).move();
    }
  }
}