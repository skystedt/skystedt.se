/** @type {unknown} */
export const UnknownNull = null;

/** @abstract */
class Position {
  #x;
  #y;
  get x() { return this.#x; }
  get y() { return this.#y; }

  /** @param {number} x, @param {number} y */
  constructor(x, y) {
    this.#x = x;
    this.#y = y;
  }
}
// the private methods are to distinguish the classes so they are not evaluated as the same class
export class AbsolutePosition extends Position { #AbsolutePosition() { } }
export class GamePosition extends Position { #GamePosition() { } }
export class DisplayPosition extends Position { #DisplayPosition() { } }

export class Movement {
  #dx;
  #dy;
  get dx() { return this.#dx; }
  get dy() { return this.#dy; }

  /** @param {number} dx, @param {number} dy */
  constructor(dx, dy) {
    this.#dx = dx;
    this.#dy = dy;
  }
}

export class Size {
  #width;
  #height;
  get width() { return this.#width; }
  get height() { return this.#height; }

  /** @param {number} width, @param {number} height */
  constructor(width, height) {
    this.#width = width;
    this.#height = height;
  }
}

export class Offset {
  #left;
  #top;
  get left() { return this.#left; }
  get top() { return this.#top; }

  /** @param {number} left, @param {number} top */
  constructor(left, top) {
    this.#left = left;
    this.#top = top;
  }
}

export class Borders {
  #top;
  #right;
  #bottom;
  #left;
  get top() { return this.#top; }
  get right() { return this.#right; }
  get bottom() { return this.#bottom; }
  get left() { return this.#left; }

  /** @param {number} top, @param {number} right, @param {number} bottom, @param {number} left */
  constructor(top, right, bottom, left) {
    this.#top = top;
    this.#right = right;
    this.#bottom = bottom;
    this.#left = left;
  }
}