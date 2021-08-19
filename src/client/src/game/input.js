import './input.css';
import { AbsolutePosition, Movement } from './primitives.js';
/** @typedef { import("./primitives.js").DisplayPosition } DisplayPosition */
/** @typedef { import("./primitives.js").GamePosition } GamePosition */
/** @typedef { import("./display.js").default } Display */

export default class Input {
  #display;
  #keys = { left: false, up: false, right: false, down: false };
  /** @type {{ id: number, timestamp: DOMHighResTimeStamp, position: AbsolutePosition }[]} */
  #touches = [];
  /** @type {AbsolutePosition?} */
  #mouse = null;

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
      case 37: this.#keys.left = true; break;
      case 38: this.#keys.up = true; break;
      case 39: this.#keys.right = true; break;
      case 40: this.#keys.down = true; break;
      default: return;
    }
    event.preventDefault();
  }

  /** @param {KeyboardEvent} event */
  #keyup(event) {
    switch (event.keyCode) {
      case 37: this.#keys.left = false; break;
      case 38: this.#keys.up = false; break;
      case 39: this.#keys.right = false; break;
      case 40: this.#keys.down = false; break;
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

  /** @param {any[]} array, @param {(element: any) => number} by */
  static #minBy(array, by) {
    return array.reduce((best, next) => !best ? next : Math.min(by(best), by(next)) === by(best) ? best : next, null)
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

  /** @param {GamePosition} relativeTo */
  movement(relativeTo) {
    const touch = Input.#minBy(this.#touches, t => t.timestamp);
    if (touch) {
      return this.#relativeDirection(touch.position, relativeTo);
    } else if (this.#mouse) {
      return this.#relativeDirection(this.#mouse, relativeTo);
    } else {
      const dx = (this.#keys.left ? -1 : 0) + (this.#keys.right ? 1 : 0);
      const dy = (this.#keys.up ? -1 : 0) + (this.#keys.down ? 1 : 0);
      return new Movement(dx, dy);
    }
  }
}