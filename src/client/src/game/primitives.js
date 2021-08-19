class Position {
  x;
  y;

  /** @param {number} x, @param {number} y */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
export class AbsolutePosition extends Position {
}
export class GamePosition extends Position {
}
export class DisplayPosition extends Position {
}

export class Movement {
  dx;
  dy;

  /** @param {number} dx, @param {number} dy */
  constructor(dx, dy) {
    this.dx = dx;
    this.dy = dy;
  }
}

export class Size {
  width;
  height;

  /** @param {number} width, @param {number} height */
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
}

export class Offset {
  left;
  top;

  /** @param {number} left, @param {number} top */
  constructor(left, top) {
    this.left = left;
    this.top = top;
  }
}

export class Borders {
  top;
  right;
  bottom;
  left;

  /** @param {number} top, @param {number} right, @param {number} bottom, @param {number} left */
  constructor(top, right, bottom, left) {
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
  }
}