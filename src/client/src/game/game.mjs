import './game.css';
import Display from './display.mjs';
import Input from './input.mjs';
import * as PIXI from './pixi.mjs';
import { Uninitialized } from './primitives.mjs';
import Ship, { ShipDirection } from './ship.mjs';
import Stars from './stars.mjs';
/** @typedef { number } DOMHighResTimeStamp */
/** @typedef { import("@microsoft/applicationinsights-web").ApplicationInsights } ApplicationInsights */

const LOGIC_FPS = 100;
const BACKGROUND_FPS = 30;
const WAIT_BEFORE_FPS_CHECK = 1000;
const MAX_LOG_METRIC_RETRIES = 10;

const STARS = 100;

export default class Game {
  #app;
  #display;
  #input;

  #loopState = {
    fpsCheck: 0,
    logicWait: 0,
    logicRemaining: 0,
    backgroundWait: 0,
    backgroundRemaining: 0,
    lastTimestamp: 0
  };

  #stars = /** @type {Stars} */ (Uninitialized);
  #ship = /** @type {Ship} */ (Uninitialized);

  get canvas() {
    return this.#app.view;
  }

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
      this.#stars = new Stars(this.#app.stage, this.#display.gameSize, BACKGROUND_FPS, STARS);
      this.#ship = new Ship(this.#app.loader.resources, this.#app.stage, this.#display.gameSize);
      this.#startFrameLoop();
      this.#gameReset();
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
    this.#loopState.fpsCheck = this.#loopState.lastTimestamp + WAIT_BEFORE_FPS_CHECK;
    requestAnimationFrame(this.#frameLoop.bind(this));
  }

  #gameReset() {
    //
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

    // if inactive or lag, don't process all missing time at once
    if (elapsed >= 200) {
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

    if (this.#loopState.fpsCheck && timestamp > this.#loopState.fpsCheck) {
      this.#loopState.fpsCheck = 0;
      this.#checkFps();
    }
  }

  #checkFps() {
    const fps = Math.round(this.#app.ticker.FPS);

    this.#logFpsMetric(fps, 0);

    if (fps >= LOGIC_FPS) {
      // eslint-disable-next-line no-console
      console.debug(`FPS: ${fps}`);
    } else {
      console.warn(`Low FPS (target: ${LOGIC_FPS}): ${fps}`);
    }
  }

  /**
   * @param {number} fps
   * @param {number} logTry
   */
  #logFpsMetric(fps, logTry) {
    const insights = /** @type {ApplicationInsights} */ (/** @type {any} */ (window).insights);

    if (insights) {
      insights.trackMetric({ name: 'fps', average: fps });
    } else if (logTry < MAX_LOG_METRIC_RETRIES) {
      setTimeout(this.#logFpsMetric.bind(this), 1000, fps, ++logTry);
    }
  }

  #updateLogic() {
    const movement = this.#input.movement(this.#ship.centerPosition);
    this.#ship.position = this.#display.restrictGamePositionToDisplay(this.#ship.position, movement, this.#ship.size);
    if (movement.dx < 0) {
      this.#ship.direction = ShipDirection.Left;
    } else if (movement.dx > 0) {
      this.#ship.direction = ShipDirection.Right;
    } else {
      this.#ship.direction = ShipDirection.Straight;
    }
  }

  #updateBackground() {
    this.#stars.move();
  }
}
