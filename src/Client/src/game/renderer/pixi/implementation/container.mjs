import * as PIXI_D from '@pixi/display';
import * as PIXI_G from '@pixi/graphics';
import * as PIXI_S from '@pixi/sprite';

/** @typedef {import("../../contract").Container} Contract */

export default class Container extends PIXI_D.Container {
  /** @type {Contract["addChild"] } */
  // @ts-ignore
  addChild(child) {
    super.addChild(/** @type { PIXI_S.Sprite | PIXI_G.Graphics } */ (child));
  }

  /** @type {Contract["removeChild"] } */
  // @ts-ignore
  removeChild(child) {
    super.removeChild(/** @type { PIXI_S.Sprite | PIXI_G.Graphics } */ (child));
  }
}
