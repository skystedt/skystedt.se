import { Texture, ExtensionType } from '@pixi/core';

export const loadPngBase64 = {
  extension: ExtensionType.LoadParser,

  /**
   * @param {string} url
   * @returns {boolean}
   */
  test(url) {
    return /^data:image\/png;base64,/.test(url);
  },

  /**
   * @param {string} url
   * @returns {Promise<Texture>}
   */
  async load(url) {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = url;
    });

    const texture = Texture.from(image);
    return texture;
  },

  /** @param {Texture} texture */
  unload(texture) {
    texture.destroy(true);
  }
};
