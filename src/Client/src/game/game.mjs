import { initializeRenderer } from '$renderer';
import RenderingContext from '../renderers/rendering-context.mjs';
import Communication, { MessageType } from './communication.mjs';
import './game.css';
import Input from './input.mjs';
import Minis from './minis.mjs';
import { GamePosition, Uninitialized } from './primitives.mjs';
import Ship, { ShipDirection } from './ship.mjs';
import Stars from './stars.mjs';
import View from './view.mjs';

/** @typedef { number } DOMHighResTimeStamp */
/** @typedef { ReturnType<RenderingContext.information> } RenderingInformation */
/** @typedef { import("../renderers/contract").Renderer } Renderer */
/** @typedef { import("../renderers/contract").Application } Application */
/** @typedef { import("@microsoft/applicationinsights-web").ApplicationInsights } ApplicationInsights */
/** @typedef { import("./communication-data").CommunicationData } CommunicationData */
/** @typedef { import("./communication-data").CommunicationDataInit } CommunicationDataInit */
/** @typedef { import("./communication-data").CommunicationDataConnect } CommunicationDataConnect */
/** @typedef { import("./communication-data").CommunicationDataDisconnect } CommunicationDataDisconnect */
/** @typedef { import("./communication-data").CommunicationDataUpdate } CommunicationDataUpdate */

const LOGIC_FPS = 100;
const BACKGROUND_FPS = 30;
const WAIT_BEFORE_FPS_CHECK = 1000;
const MAX_LOG_METRIC_RETRIES = 10;

const STARS = 100;

export default class Game {
  #parent;
  #currentFps = /** @type {() => number} */ (Uninitialized);
  #view = /** @type {View} */ (Uninitialized);
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
    const renderer = await initializeRenderer();

    const application = await renderer.createApplication();
    application.element.classList.add('game');
    this.#parent.append(application.element);

    await this.load(renderer, application);
    this.#startFrameLoop();
    await this.#communication.connect();
  }

  /**
   * @param {Renderer} renderer
   * @param {Application} application
   */
  async load(renderer, application) {
    this.#currentFps = () => application.ticker.FPS;
    this.#view = new View(application, true);
    this.#input = new Input(this.#view);
    this.#communication = new Communication(
      this.#communicationReceived.bind(this),
      this.#communicationSendUpdate.bind(this)
    );

    const middle = new GamePosition(this.#view.gameSize.width / 2, this.#view.gameSize.height / 2);

    // order determines z order, last will be on top
    this.#stars = new Stars(renderer, application);
    this.#minis = new Minis(renderer, application);
    this.#ship = new Ship(renderer, application);

    await this.#ship.load(middle);
    await this.#minis.load();
    this.#stars.load(this.#view.gameSize, STARS);
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
    const renderingInformation = RenderingContext.information(this.#view.element);

    this.#logFpsMetric(fps, renderingInformation, 0);

    // eslint-disable-next-line no-console
    console.debug(`Context: ${renderingInformation.context}, Information: ${renderingInformation.information}`);

    if (fps >= LOGIC_FPS) {
      // eslint-disable-next-line no-console
      console.debug(`FPS: ${fps}`);
    } else {
      console.warn(`Low FPS (target: ${LOGIC_FPS}): ${fps}`);
    }
  }

  /**
   * @param {number} fps
   * @param {RenderingInformation} renderingInformation
   * @param {number} logTry
   */
  #logFpsMetric(fps, renderingInformation, logTry) {
    const { insights } = /** @type {{ insights: ApplicationInsights }} */ (/** @type {unknown} */ (window));

    if (insights) {
      insights.trackMetric({ name: 'fps', average: fps }, renderingInformation);
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
    this.#ship.position = this.#view.restrictGamePositionToView(this.#ship.position, movement, this.#ship.size);
    if (movement.dx < 0) {
      this.#ship.direction = ShipDirection.Left;
    } else if (movement.dx > 0) {
      this.#ship.direction = ShipDirection.Right;
    } else {
      this.#ship.direction = ShipDirection.Straight;
    }
  }

  /** @param {CommunicationData} data  */
  #communicationReceived(data) {
    switch (data.type) {
      case MessageType.Init: {
        this.#communicationReceivedInit(/** @type {CommunicationDataInit} */ (data));
        break;
      }

      case MessageType.Connect: {
        this.#communicationReceivedConnect(/** @type {CommunicationDataConnect} */ (data));
        break;
      }

      case MessageType.Disconnect: {
        this.#communicationReceivedDisconnect(/** @type {CommunicationDataDisconnect} */ (data));
        break;
      }

      case MessageType.Update: {
        this.#communicationReceivedUpdate(/** @type {CommunicationDataUpdate} */ (data));
        break;
      }

      default: {
        console.warn('Unknown communication type', data);
        break;
      }
    }
  }

  /** @param {CommunicationDataInit} data  */
  #communicationReceivedInit(data) {
    this.#minis.clear();
    for (const id of /** @type {string[]} */ (data.ids)) {
      this.#minis.add(id);
    }
  }

  /** @param {CommunicationDataConnect} data  */
  #communicationReceivedConnect(data) {
    this.#minis.add(data.id);
  }

  /** @param {CommunicationDataDisconnect} data  */
  #communicationReceivedDisconnect(data) {
    this.#minis.remove(data.id);
  }

  /** @param {CommunicationDataUpdate} data  */
  #communicationReceivedUpdate(data) {
    this.#minis.update(data.id, data.x, data.y);
  }

  #communicationSendUpdate() {
    this.#communication.sendBeacon({
      x: this.#ship.centerPosition.x,
      y: this.#ship.centerPosition.y
    });
  }
}
