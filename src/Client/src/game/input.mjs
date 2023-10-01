import './input.css';
import Display from './display.mjs';
import { AbsolutePosition, GamePosition, Movement } from './primitives.mjs';

/** @typedef { number } DOMHighResTimeStamp */

const KEY_CODE_LEFT = 37;
const KEY_CODE_UP = 38;
const KEY_CODE_RIGHT = 39;
const KEY_CODE_DOWN = 40;

const GAMEPAD_BUTTON_UP = 12;
const GAMEPAD_BUTTON_DOWN = 13;
const GAMEPAD_BUTTON_LEFT = 14;
const GAMEPAD_BUTTON_RIGHT = 15;

const GAMEPAD_AXIS_MINIMUM_VALUE = 0.2;

export default class Input {
  #display;

  #keys = { up: false, right: false, down: false, left: false };
  /** @type {{ id: number, timestamp: DOMHighResTimeStamp, position: AbsolutePosition }[]} */
  #touches = [];
  /** @type {AbsolutePosition?} */
  #mouse = null;
  /** @type {number?} */
  #gamepadIndex = null;

  /**
   * @param {any[]} array
   * @param {(element: any) => number} by
   * @returns {any}
   */
  static #minBy(array, by) {
    return array.reduce((best, next) => (!best ? next : Math.min(by(best), by(next)) === by(best) ? best : next), null);
  }

  /** @param {Display} display */
  constructor(display) {
    this.#display = display;

    window.addEventListener('blur', this.#blur.bind(this));

    window.addEventListener('keydown', this.#keydown.bind(this));
    window.addEventListener('keyup', this.#keyup.bind(this));

    window.addEventListener('touchstart', this.#touchstart.bind(this));
    window.addEventListener('touchmove', this.#touchmove.bind(this));
    window.addEventListener('touchend', this.#touchend.bind(this));
    window.addEventListener('touchcancel', this.#touchcancel.bind(this));

    window.addEventListener('mousedown', this.#mousedown.bind(this));
    window.addEventListener('mousemove', this.#mousemove.bind(this));
    window.addEventListener('mouseup', this.#mouseup.bind(this));

    window.addEventListener('gamepadconnected', this.#gamepadconnected.bind(this));
    window.addEventListener('gamepaddisconnected', this.#gamepaddisconnected.bind(this));
  }

  #blur() {
    this.#keys.left = false;
    this.#keys.up = false;
    this.#keys.right = false;
    this.#keys.down = false;
    this.#touches = [];
    this.#mouse = null;
  }

  /** @param {KeyboardEvent} event */
  #keydown(event) {
    if (this.#keySwitch(event, true)) {
      event.preventDefault();
    }
  }

  /** @param {KeyboardEvent} event */
  #keyup(event) {
    if (this.#keySwitch(event, false)) {
      event.preventDefault();
    }
  }

  /** @param {TouchEvent} event */
  #touchstart(event) {
    for (let touch of event.changedTouches) {
      this.#addTouch(touch, event.timeStamp);
    }
  }

  /** @param {TouchEvent} event */
  #touchmove(event) {
    for (let touch of event.changedTouches) {
      const foundTouch = this.#touches.find((t) => t.id === touch.identifier);
      if (foundTouch) {
        foundTouch.position = new AbsolutePosition(touch.clientX, touch.clientY);
      } else {
        this.#addTouch(touch, event.timeStamp);
      }
    }
  }

  /** @param {TouchEvent} event */
  #touchend(event) {
    for (let touch of event.changedTouches) {
      this.#deleteTouch(touch);
    }
    event.preventDefault();
  }

  /** @param {TouchEvent} event */
  #touchcancel(event) {
    for (let touch of event.changedTouches) {
      this.#deleteTouch(touch);
    }
  }

  /** @param {MouseEvent} event */
  #mousedown(event) {
    if ((event.buttons & (1 + 2)) != 0) {
      this.#mouse = new AbsolutePosition(event.clientX, event.clientY);
    }
  }

  /** @param {MouseEvent} event */
  #mousemove(event) {
    if ((event.buttons & (1 + 2)) != 0) {
      this.#mouse = new AbsolutePosition(event.clientX, event.clientY);
    }
  }

  #mouseup() {
    this.#mouse = null;
  }

  /** @param {GamepadEvent} event */
  #gamepadconnected(event) {
    if (!this.#gamepadIndex) {
      this.#gamepadIndex = event.gamepad.index;
    }
  }

  /** @param {GamepadEvent} event */
  #gamepaddisconnected(event) {
    if (this.#gamepadIndex === event.gamepad.index) {
      this.#gamepadIndex = null;
    }
  }

  /**
   * @param {KeyboardEvent} event
   * @param {boolean} value
   * @returns {boolean}
   */
  #keySwitch(event, value) {
    switch (event.keyCode) {
      case KEY_CODE_UP:
        this.#keys.up = value;
        break;
      case KEY_CODE_RIGHT:
        this.#keys.right = value;
        break;
      case KEY_CODE_DOWN:
        this.#keys.down = value;
        break;
      case KEY_CODE_LEFT:
        this.#keys.left = value;
        break;
      default:
        return false;
    }
    return true;
  }

  /**
   * @param {Touch} touch
   * @param {DOMHighResTimeStamp} timestamp
   */
  #addTouch(touch, timestamp) {
    this.#touches.push({
      id: touch.identifier,
      timestamp: timestamp,
      position: new AbsolutePosition(touch.clientX, touch.clientY)
    });
  }

  /** @param {Touch} touch */
  #deleteTouch(touch) {
    const index = this.#touches.findIndex((t) => t.id === touch.identifier);
    if (index > -1) {
      this.#touches.splice(index, 1);
    }
  }

  #gamepadInput() {
    if (!navigator.getGamepads) {
      return null;
    }
    // eslint-disable-next-line compat/compat
    const gamepads = Array.from(navigator.getGamepads());
    const gamepad = gamepads.find((gamepad) => gamepad?.index === this.#gamepadIndex);
    if (!gamepad) {
      return null;
    }

    // axes take precedence over buttons
    for (let i = 0; i < gamepad.axes.length; i += 2) {
      const dx = gamepad.axes[i];
      const dy = gamepad.axes[i + 1];
      if (Math.abs(dx) >= GAMEPAD_AXIS_MINIMUM_VALUE || Math.abs(dy) >= GAMEPAD_AXIS_MINIMUM_VALUE) {
        return new Movement(dx, dy);
      }
    }

    const up = gamepad.buttons[GAMEPAD_BUTTON_UP]?.pressed;
    const right = gamepad.buttons[GAMEPAD_BUTTON_RIGHT]?.pressed;
    const down = gamepad.buttons[GAMEPAD_BUTTON_DOWN]?.pressed;
    const left = gamepad.buttons[GAMEPAD_BUTTON_LEFT]?.pressed;
    if (up || right || down || left) {
      return this.#absolutDirection(up, right, down, left);
    }

    return null;
  }

  /**
   * @param {AbsolutePosition} position
   * @param {GamePosition} relativeTo
   * @returns {Movement}
   */
  #relativeDirection(position, relativeTo) {
    const absolutePosition = this.#display.convert.gameToAbsolute(relativeTo);
    const directionX = position.x - absolutePosition.x;
    const directionY = position.y - absolutePosition.y;
    const max = Math.max(Math.abs(directionX), Math.abs(directionY));
    // the condition for larger than resolution is to prevent "flip-flopping" movements (jumping back and forth)
    const dx = Math.abs(directionX) > this.#display.resolution ? directionX / max : 0;
    const dy = Math.abs(directionY) > this.#display.resolution ? directionY / max : 0;
    return new Movement(dx, dy);
  }

  /**
   * @param {boolean} up
   * @param {boolean} right
   * @param {boolean} down
   * @param {boolean} left
   * @returns {Movement}
   */
  #absolutDirection(up, right, down, left) {
    const dx = (left ? -1 : 0) + (right ? 1 : 0);
    const dy = (up ? -1 : 0) + (down ? 1 : 0);
    return new Movement(dx, dy);
  }

  /**
   * @param {GamePosition} relativeTo
   * @returns {Movement}
   */
  movement(relativeTo) {
    const gamepad = this.#gamepadInput();
    if (gamepad) {
      return gamepad;
    }

    const touch = Input.#minBy(this.#touches, (t) => t.timestamp);
    if (touch) {
      return this.#relativeDirection(touch.position, relativeTo);
    }

    if (this.#mouse) {
      return this.#relativeDirection(this.#mouse, relativeTo);
    }

    return this.#absolutDirection(this.#keys.up, this.#keys.right, this.#keys.down, this.#keys.left);
  }
}
