import './input.css';

export default class Input {
  #keys = { left: false, up: false, right: false, down: false };
  #touches = [];
  #mouse = { down: false, x: 0, y: 0 };

  constructor() {
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

  #blur(event) {
    this.#keys.left = false;
    this.#keys.up = false;
    this.#keys.right = false;
    this.#keys.down = false;
    this.#touches = [];
    this.#mouse.down = false;
  }

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

  #touchstart(event) {
    for (const touch of event.changedTouches) {
      this.#addTouch(touch);
    }
  }

  #touchmove(event) {
    for (const touch of event.changedTouches) {
      const foundTouch = this.#touches.find(t => t.id === touch.identifier);
      if (foundTouch) {
        foundTouch.x = touch.clientX;
        foundTouch.y = touch.clientY;
      } else {
        this.#addTouch(touch);
      }
    }
  }

  #touchend(event) {
    for (const touch of event.changedTouches) {
      this.#deleteTouch(touch);
    }
    event.preventDefault();
  }

  #touchcancel(event) {
    for (const touch of event.changedTouches) {
      this.#deleteTouch(touch);
    }
  }

  #addTouch(touch) {
    this.#touches.push({
      id: touch.identifier,
      timestamp: event.timeStamp,
      x: touch.clientX,
      y: touch.clientY
    });
  }

  #mousedown(event) {
    this.#mouse.down = true;
    this.#mouse.x = event.clientX;
    this.#mouse.y = event.clientY;
  }

  #mousemove(event) {
    this.#mouse.x = event.clientX;
    this.#mouse.y = event.clientY;
  }

  #mouseup(event) {
    this.#mouse.down = false;
  }

  #deleteTouch(touch) {
    const index = this.#touches.findIndex(t => t.id === touch.identifier);
    if (index > -1) {
      this.#touches.splice(index, 1);
    }
  }

  static #minBy(array, by) {
    return array.reduce((best, next) => !best ? next : Math.min(by(best), by(next)) === by(best) ? best : next, null)
  }

  static #relativeDirection(inputX, inputY, relativeX, relativeY, resolution) {
    const directionX = inputX - relativeX;
    const directionY = inputY - relativeY;
    const max = Math.max(Math.abs(directionX), Math.abs(directionY));
    const dx = Math.abs(directionX) > resolution ? directionX / max : 0;
    const dy = Math.abs(directionY) > resolution ? directionY / max : 0;
    return { dx, dy };
  }

  direction(resolution, relativeX, relativeY) {
    const touch = Input.#minBy(this.#touches, t => t.timestamp);
    if (touch) {
      return Input.#relativeDirection(touch.x, touch.y, relativeX, relativeY, resolution);
    } else if (this.#mouse.down) {
      return Input.#relativeDirection(this.#mouse.x, this.#mouse.y, relativeX, relativeY, resolution);
    } else {
      const dx = (this.#keys.left ? -1 : 0) + (this.#keys.right ? 1 : 0);
      const dy = (this.#keys.up ? -1 : 0) + (this.#keys.down ? 1 : 0);
      return { dx, dy };
    }
  }
}