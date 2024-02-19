import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import Communication, { MessageType } from './communication.mjs';
import Display from './display.mjs';
import './game.css';
import Input from './input.mjs';
import Minis from './minis.mjs';
import pixiSettings from './pixi-settings.mjs';
import { Application } from './pixi.mjs';
import { Uninitialized } from './primitives.mjs';
import Ship, { ShipDirection } from './ship.mjs';
import Stars from './stars.mjs';

/** @typedef { number } DOMHighResTimeStamp */

const LOGIC_FPS = 100;
const BACKGROUND_FPS = 30;
const WAIT_BEFORE_FPS_CHECK = 1000;
const MAX_LOG_METRIC_RETRIES = 10;

const STARS = 100;

export default class Game {
  #parent;
  #currentFps = /** @type {() => number} */ (Uninitialized);
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

  /** @param {HTMLElement} parent */
  constructor(parent) {
    this.#parent = parent;
  }

  async init() {
    pixiSettings();

    const app = new Application();

    this.#parent.appendChild(/** @type {HTMLCanvasElement} */ (app.view));

    await this.load(app);
    this.#startFrameLoop();
    await this.#communication.connect();
  }

  /** @param {Application} app */
  async load(app) {
    this.#currentFps = () => app.ticker.FPS;
    this.#display = new Display(app.renderer, app.stage, /** @type {HTMLCanvasElement} */ (app.view), true);
    this.#input = new Input(this.#display);
    this.#communication = new Communication(
      this.#communicationReceived.bind(this),
      this.#communicationSendUpdate.bind(this)
    );

    // order determines z order, last will be on top
    this.#stars = new Stars(app.stage);
    this.#minis = new Minis(app.stage);
    this.#ship = new Ship(app.stage);

    await this.#ship.load(this.#display.gameSize);
    await this.#minis.load();
    this.#stars.load(this.#display.gameSize, STARS);
  }

  #startFrameLoop() {
    this.#frameState.logicRemaining = 0;
    this.#frameState.backgroundRemaining = 0;
    this.#frameState.fpsCheck = this.#frameState.lastTimestamp + WAIT_BEFORE_FPS_CHECK;
    requestAnimationFrame(this.#frameLoop.bind(this));
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

    while (logicTicks) {
      logicTicks -= 1;
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
    const fps = Math.round(this.#currentFps());

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
    /** @type {{ insights: ApplicationInsights }} */
    const { insights } = /** @type {any} */ (window);

    if (insights) {
      insights.trackMetric({ name: 'fps', average: fps });
    } else if (logTry < MAX_LOG_METRIC_RETRIES) {
      setTimeout(this.#logFpsMetric.bind(this), 1000, fps, logTry + 1);
    }
  }

  #updateLogic() {
    this.#updateShip();
  }

  #updateBackground() {
    this.#minis.tick();
    this.#stars.tick();
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

  /** @param {any} data  */
  #communicationReceived(data) {
    switch (data.type) {
      case MessageType.Init: {
        this.#minis.clear();
        data.ids.forEach((/** @type {string} */ id) => {
          this.#minis.add(id);
        });
        break;
      }

      case MessageType.Connect: {
        this.#minis.add(data.id);
        break;
      }

      case MessageType.Disconnect: {
        this.#minis.remove(data.id);
        break;
      }

      case MessageType.Update: {
        this.#minis.update(data.id, data.x, data.y);
        break;
      }

      default:
        console.warn('Unknown communication type', data);
        break;
    }
  }

  #communicationSendUpdate() {
    this.#communication.sendBeacon({
      x: this.#ship.centerPosition.x,
      y: this.#ship.centerPosition.y
    });
  }
}
