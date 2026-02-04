export default class RenderingContext {
  /**
   * @param {HTMLElement} element
   * @returns {{ context: string, information: string }}
   */
  static information(element) {
    if (!(element instanceof HTMLCanvasElement)) {
      return { context: 'html', information: 'html' };
    }

    const result =
      this.#info(element, 'webgpu', this.#webgpuContext) ||
      this.#info(element, 'webgl2', this.#webglInformation) ||
      this.#info(element, 'webgl', this.#webglInformation) ||
      this.#info(element, 'experimental-webgl', this.#webglInformation) ||
      this.#info(element, '2d', this.#twodInformation) ||
      null;

    if (result) {
      return result;
    }

    return { context: 'unknown', information: 'unknown' };
  }

  /**
   * @template {GPUCanvasContext | WebGLRenderingContext | CanvasRenderingContext2D} T
   * @param {HTMLCanvasElement} canvas
   * @param { "webgpu" | "webgl2" | "webgl" | "experimental-webgl" | "2d" } contextId
   * @param {(context: T) => string} contextInformation
   * @returns {{ context: string, information: string }?}
   */
  static #info(canvas, contextId, contextInformation) {
    const context = /** @type {T | null} */ (canvas.getContext(contextId));

    if (!context) {
      return null;
    }

    const information = contextInformation(context);

    return {
      context: contextId,
      information
    };
  }

  /**
   * @param {GPUCanvasContext} context
   * @returns {string}
   */
  static #webgpuContext(context) {
    const adapterInfo = context.getConfiguration()?.device.adapterInfo;
    if (adapterInfo) {
      return `${adapterInfo.vendor}, ${adapterInfo.architecture}`;
    }
    return 'missing';
  }

  /**
   * @param {WebGLRenderingContext} context
   * @returns {string}
   */
  static #webglInformation(context) {
    const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
    return 'missing';
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @returns {string}
   */
  // eslint-disable-next-line no-unused-vars
  static #twodInformation(context) {
    return '2d';
  }
}
