import Display from './display.js';
import Input from './input.js';
import * as PIXI from './pixi.js';
import { Size, UnknownNull } from './primitives.js';
import Ship, { ShipDirection } from './ship.js';
import Star from './star.js';

const LOGIC_FPS = 100;
const BACKGROUND_FPS = 30;

const STARS = 100;
const SHIP_ALLOWED_OUTSIDE_SIZE = new Size(1, 0);

export default class Game {
  #app;
  #display;
  #input;

  #loopState = { lowFpsCheck: 0, logicWait: 0, logicRemaining: 0, backgroundWait: 0, backgroundRemaining: 0, lastTimestamp: 0 };

  /** @type {PIXI.Container} */
  #stars = (UnknownNull);
  /** @type {Ship} */
  #ship = (UnknownNull);

  get canvas() { return this.#app.view; }

  constructor() {
    PIXI.utils.skipHello();

    this.#app = new PIXI.Application();
    this.#display = new Display(this.#app.renderer, this.#app.stage, this.canvas, true);
    this.#input = new Input(this.#display);

    Ship.addResources(this.#app.loader);
    this.#app.loader.load(this.#initialize.bind(this));
  }

  #initialize() {
    try {
      this.#stars = Star.container(this.#app.stage, STARS, this.#display.gameSize);
      this.#ship = new Ship(this.#app.loader.resources, this.#app.stage, this.#display.gameSize);
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
    this.#loopState.lowFpsCheck = this.#loopState.lastTimestamp + 1000;
    requestAnimationFrame(this.#frameLoop.bind(this));
  }

  /** @param {DOMHighResTimeStamp} timestamp */
  #frameLoop(timestamp) {
    requestAnimationFrame(this.#frameLoop.bind(this));

    if (!this.#loopState.lastTimestamp) {
      this.#loopState.lastTimestamp = timestamp;
    }
    const elapsed = timestamp - this.#loopState.lastTimestamp;
    this.#loopState.lastTimestamp = timestamp;

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
    const movement = this.#input.movement(this.#ship.centerPosition);
    this.#ship.position = this.#display.restrictGamePositionToDisplay(this.#ship.position, movement, this.#ship.size, SHIP_ALLOWED_OUTSIDE_SIZE);
    if (movement.dx < 0) {
      this.#ship.direction = ShipDirection.Left;
    } else if (movement.dx > 0) {
      this.#ship.direction = ShipDirection.Right;
    } else {
      this.#ship.direction = ShipDirection.Straight;
    }
  }

  #updateBackground() {
    for (const star of this.#stars.children) {
      /** @type {Star} */
      (star).move();
    }
  }
}