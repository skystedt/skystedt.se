export default class RenderingContext {
  /**
   * @param {HTMLCanvasElement} canvas
   * @returns {{ context: string, information: string }}
   */
  static information(canvas) {
    /** @type {GPUCanvasContext | WebGLRenderingContext | CanvasRenderingContext2D | null} */ let context;
    let contextId;
    let contextInformation;

    /* eslint-disable no-cond-assign */
    if ((context = canvas.getContext((contextId = 'webgpu')))) {
      contextInformation = this.#webgpuContext(context);
    } else if ((context = canvas.getContext((contextId = 'webgl2')))) {
      contextInformation = this.#webglInformation(context);
    } else if ((context = canvas.getContext((contextId = 'webgl')))) {
      contextInformation = this.#webglInformation(context);
    } else if (
      (context = /** @type {WebGLRenderingContext} */ (canvas.getContext((contextId = 'experimental-webgl'))))
    ) {
      contextInformation = this.#webglInformation(context);
    } else if ((context = canvas.getContext((contextId = '2d')))) {
      contextInformation = '';
    } else {
      contextId = 'unknown';
      contextInformation = '';
    }
    /* eslint-enable no-cond-assign */
    return {
      context: contextId,
      information: contextInformation
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
    return '';
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
    return '';
  }
}
