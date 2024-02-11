import util from 'node:util';
import webpack from 'webpack';

/** @typedef { string | { [key: string]: {} } } Content */

export default class PostCompilationPrintPlugin {
  /** @type {() => Content} */
  #content;

  /** @param {() => Content} content */
  constructor(content) {
    this.#content = content;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.afterDone.tap('PostCompilationPrintPlugin', () => {
      const data = this.#content();
      this.#print(data);
    });
  }

  /** @param {Content} data */
  #print(data) {
    // breakLength is tuned so single element arrays are printed on one line
    // multi element arrays are printed on multiple lines
    // objects are printed on multiple lines
    const message = util.inspect(data, { depth: Infinity, colors: true, compact: 1, breakLength: 28 });
    // eslint-disable-next-line no-console
    console.log(message);
  }
}
