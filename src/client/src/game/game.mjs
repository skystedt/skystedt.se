import './game.css';
import * as PIXI from './pixi.mjs';
import Display from './display.mjs';
import Input from './input.mjs';
import Communication from './communication.mjs';
import { Uninitialized } from './primitives.mjs';
import Ship, { ShipDirection } from './ship.mjs';
import Minis from './minis.mjs';
import Stars from './stars.mjs';
/** @typedef { number } DOMHighResTimeStamp */
/** @typedef { import("@microsoft/applicationinsights-web").ApplicationInsights } ApplicationInsights */

const LOGIC_FPS = 100;
const BACKGROUND_FPS = 30;
const COMMUNICATE_POSITION_INTERVAL = 10000;
const WAIT_BEFORE_FPS_CHECK = 1000;
const MAX_LOG_METRIC_RETRIES = 10;

const STARS = 100;

export default class Game {
  #app;
  #display = /** @type {Display} */ (Uninitialized);
  #input = /** @type {Input} */ (Uninitialized);
  #communication = /** @type {Communication} */ (Uninitialized);

  #frameState = {
    fpsCheck: 0,
    logicRemaining: 0,
    backgroundRemaining: 0,
    lastTimestamp: 0
  };

  #ship = /** @type {Ship} */ (Uninitialized);
  #minis = /** @type {Minis} */ (Uninitialized);
  #stars = /** @type {Stars} */ (Uninitialized);

  get canvas() {
    return this.#app.view;
  }

  constructor() {
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

    this.#app = new PIXI.Application();

    this.#display = new Display(this.#app.renderer, this.#app.stage, this.canvas, true);
    this.#input = new Input(this.#display);
    this.#communication = new Communication();

    // order determines z order, last will be on top
    this.#stars = new Stars(this.#app.stage);
    this.#minis = new Minis(this.#app.stage);
    this.#ship = new Ship(this.#app.stage);
  }

  async load() {
    try {
      await this.#ship.load(this.#display.gameSize);
      await this.#minis.load();
      this.#stars.load(this.#display.gameSize, STARS);

      this.#startFrameLoop();
      this.#gameReset();
      setInterval(this.#communicatePosition.bind(this), COMMUNICATE_POSITION_INTERVAL);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async connect() {
    await this.#communication.connect(this.#minis);
  }

  #startFrameLoop() {
    this.#frameState.logicRemaining = 0;
    this.#frameState.backgroundRemaining = 0;
    this.#frameState.fpsCheck = this.#frameState.lastTimestamp + WAIT_BEFORE_FPS_CHECK;
    requestAnimationFrame(this.#frameLoop.bind(this));
  }

  #gameReset() {
    //
  }

  /** @param {DOMHighResTimeStamp} timestamp */
  #frameLoop(timestamp) {
    requestAnimationFrame(this.#frameLoop.bind(this));

    if (!this.#frameState.lastTimestamp) {
      this.#frameState.lastTimestamp = timestamp;
    }
    const elapsed = timestamp - this.#frameState.lastTimestamp;
    this.#frameState.lastTimestamp = timestamp;

    let logicTicks;
    let backgroundTick;

    // if inactive or lag, don't process all missing time at once
    if (elapsed >= 200) {
      logicTicks = 1;
      this.#frameState.logicRemaining = 0;

      backgroundTick = true;
      this.#frameState.backgroundRemaining = 0;
    } else {
      const logicWait = 1000 / LOGIC_FPS;
      logicTicks = Math.floor((this.#frameState.logicRemaining + elapsed) / logicWait);
      this.#frameState.logicRemaining += elapsed - logicTicks * logicWait;

      const backgroundWait = 1000 / BACKGROUND_FPS;
      backgroundTick = this.#frameState.backgroundRemaining > backgroundWait;
      this.#frameState.backgroundRemaining += elapsed - (backgroundTick ? backgroundWait : 0);
    }

    while (logicTicks--) {
      this.#updateLogic();
    }

    if (backgroundTick) {
      this.#updateBackground();
    }

    if (this.#frameState.fpsCheck && timestamp > this.#frameState.fpsCheck) {
      this.#frameState.fpsCheck = 0;
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
    this.#updateShip();
  }

  #updateBackground() {
    this.#minis.tick();
    this.#stars.tick();
  }

  #communicatePosition() {
    this.#communication.update(this.#ship.centerPosition);
  }

  #updateShip() {
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
}
