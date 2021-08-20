import './input.css';
import { AbsolutePosition, Movement } from './primitives.js';
/** @typedef { import("./primitives.js").DisplayPosition } DisplayPosition */
/** @typedef { import("./primitives.js").GamePosition } GamePosition */
/** @typedef { import("./display.js").default } Display */

const KEY_CODE_LEFT = 37;
const KEY_CODE_UP = 38;
const KEY_CODE_RIGHT = 39;
const KEY_CODE_DOWN = 40;

const GAMEPAD_BUTTON_UP = 12;
const GAMEPAD_BUTTON_DOWN = 13;
const GAMEPAD_BUTTON_LEFT = 14;
const GAMEPAD_BUTTON_RIGHT = 15;

const GAMEPAD_AXIS_MINIMUM_VALUE = 0.1;

class AbsoluteDirections {
  up;
  right;
  down;
  left;
  /** @param {boolean} up, @param {boolean} right, @param {boolean} down, @param {boolean} left */
  constructor(up = false, right = false, down = false, left = false) {
    this.up = up;
    this.right = right;
    this.down = down;
    this.left = left;
  }
}

export default class Input {
  #display;

  #keys = new AbsoluteDirections();
  /** @type {{ id: number, timestamp: DOMHighResTimeStamp, position: AbsolutePosition }[]} */
  #touches = [];
  /** @type {AbsolutePosition?} */
  #mouse = null;
  /** @type {Gamepad?} */
  #gamepad = null;

  /** @param {any[]} array, @param {(element: any) => number} by */
  static #minBy(array, by) {
    return array.reduce((best, next) => !best ? next : Math.min(by(best), by(next)) === by(best) ? best : next, null)
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

    window.addEventListener("gamepadconnected", this.#gamepadconnected.bind(this));
    window.addEventListener("gamepaddisconnected", this.#gamepaddisconnected.bind(this));
  }

  /** @param {FocusEvent} event */
  #blur(event) {
    this.#keys.left = false;
    this.#keys.up = false;
    this.#keys.right = false;
    this.#keys.down = false;
    this.#touches = [];
    this.#mouse = null;
  }

  /** @param {KeyboardEvent} event */
  #keydown(event) {
    switch (event.keyCode) {
      case KEY_CODE_UP: this.#keys.up = true; break;
      case KEY_CODE_RIGHT: this.#keys.right = true; break;
      case KEY_CODE_DOWN: this.#keys.down = true; break;
      case KEY_CODE_LEFT: this.#keys.left = true; break;
      default: return;
    }
    event.preventDefault();
  }

  /** @param {KeyboardEvent} event */
  #keyup(event) {
    switch (event.keyCode) {
      case KEY_CODE_UP: this.#keys.up = false; break;
      case KEY_CODE_RIGHT: this.#keys.right = false; break;
      case KEY_CODE_DOWN: this.#keys.down = false; break;
      case KEY_CODE_LEFT: this.#keys.left = false; break;
      default: return;
    }
    event.preventDefault();
  }

  /** @param {TouchEvent} event */
  #touchstart(event) {
    for (const touch of event.changedTouches) {
      this.#addTouch(touch, event.timeStamp);
    }
  }

  /** @param {TouchEvent} event */
  #touchmove(event) {
    for (const touch of event.changedTouches) {
      const foundTouch = this.#touches.find(t => t.id === touch.identifier);
      if (foundTouch) {
        foundTouch.position = new AbsolutePosition(touch.clientX, touch.clientY);
      } else {
        this.#addTouch(touch, event.timeStamp);
      }
    }
  }

  /** @param {TouchEvent} event */
  #touchend(event) {
    for (const touch of event.changedTouches) {
      this.#deleteTouch(touch);
    }
    event.preventDefault();
  }

  /** @param {TouchEvent} event */
  #touchcancel(event) {
    for (const touch of event.changedTouches) {
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

  /** @param {MouseEvent} event */
  #mouseup(event) {
    this.#mouse = null;
  }

  /** @param {GamepadEvent} event */
  #gamepadconnected(event) {
    if (!this.#gamepad) {
      this.#gamepad = event.gamepad;
    }
  }

  /** @param {GamepadEvent} event */
  #gamepaddisconnected(event) {
    if (this.#gamepad && this.#gamepad.index === event.gamepad.index) {
      this.#gamepad = null;
    }
  }

  /** @param {Touch} touch, @param {DOMHighResTimeStamp} timestamp */
  #addTouch(touch, timestamp) {
    this.#touches.push({
      id: touch.identifier,
      timestamp: timestamp,
      position: new AbsolutePosition(touch.clientX, touch.clientY)
    });
  }

  /** @param {Touch} touch */
  #deleteTouch(touch) {
    const index = this.#touches.findIndex(t => t.id === touch.identifier);
    if (index > -1) {
      this.#touches.splice(index, 1);
    }
  }

  #gamepadInput() {
    const axes = /** @type {Gamepad} */ (this.#gamepad).axes;
    for (let i = 0; i < axes.length; i += 2) {
      if (axes[i] >= GAMEPAD_AXIS_MINIMUM_VALUE || axes[i + 1] >= GAMEPAD_AXIS_MINIMUM_VALUE) {
        return new Movement(axes[i], axes[i + 1]);
      }
    }
    const buttons = /** @type {Gamepad} */ (this.#gamepad).buttons;
    return this.#absolutDirection(this.#gamepadButtons(buttons));
  }

  /** @param {readonly GamepadButton[]} buttons */
  #gamepadButtons(buttons) {
    return new AbsoluteDirections(
      buttons[GAMEPAD_BUTTON_UP].pressed || buttons[GAMEPAD_BUTTON_UP].value > 0,
      buttons[GAMEPAD_BUTTON_RIGHT].pressed || buttons[GAMEPAD_BUTTON_RIGHT].value > 0,
      buttons[GAMEPAD_BUTTON_DOWN].pressed || buttons[GAMEPAD_BUTTON_DOWN].value > 0,
      buttons[GAMEPAD_BUTTON_LEFT].pressed || buttons[GAMEPAD_BUTTON_LEFT].value > 0,
    );
  }

  /** @param {AbsolutePosition} position, @param {GamePosition} relativeTo */
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

  /** @param {AbsoluteDirections} directions */
  #absolutDirection(directions) {
    const dx = (directions.left ? -1 : 0) + (directions.right ? 1 : 0);
    const dy = (directions.up ? -1 : 0) + (directions.down ? 1 : 0);
    return new Movement(dx, dy);
  }

  /** @param {GamePosition} relativeTo */
  movement(relativeTo) {
    if (this.#gamepad) {
      return this.#gamepadInput();
    }

    const touch = Input.#minBy(this.#touches, t => t.timestamp);
    if (touch) {
      return this.#relativeDirection(touch.position, relativeTo);
    }

    if (this.#mouse) {
      return this.#relativeDirection(this.#mouse, relativeTo);
    }

    return this.#absolutDirection(this.#keys);
  }
}