export default class RenderingContext {
  /**
   * @param {HTMLElement} element
   * @returns {{ context: string, information: string }}
   */
  /* eslint-disable no-cond-assign */
  static information(element) {
    if (!(element instanceof HTMLCanvasElement)) {
      return {
        context: 'html',
        information: ''
      };
    }

    /** @type {GPUCanvasContext | WebGLRenderingContext | CanvasRenderingContext2D | null} */ let context;
    let contextId;
    let contextInformation;

    if ((context = element.getContext((contextId = 'webgpu')))) {
      contextInformation = this.#webgpuContext(context);
    } else if ((context = element.getContext((contextId = 'webgl2')))) {
      contextInformation = this.#webglInformation(context);
    } else if ((context = element.getContext((contextId = 'webgl')))) {
      contextInformation = this.#webglInformation(context);
    } else if (
      (context = /** @type {WebGLRenderingContext} */ (element.getContext((contextId = 'experimental-webgl'))))
    ) {
      contextInformation = this.#webglInformation(context);
    } else if ((context = element.getContext((contextId = '2d')))) {
      contextInformation = '';
    } else {
      contextId = 'unknown';
      contextInformation = '';
    }
    return {
      context: contextId,
      information: contextInformation
    };
  }
  /* eslint-enable no-cond-assign */

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
