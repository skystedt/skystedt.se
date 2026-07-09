/** @typedef {(typeof RendererImplementation)[keyof typeof RendererImplementation]} RendererImplementation */
const RendererImplementation = /** @type {const} */ ({
  Pixi: 'pixi',
  Html: 'html',
  PixiWithHtmlFallback: 'pixi-with-html-fallback'
});

export default RendererImplementation;
