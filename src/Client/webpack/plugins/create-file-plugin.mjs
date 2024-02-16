import fs from 'node:fs/promises';
import path from 'node:path';
import webpack from 'webpack';

/** @typedef { string | { [key: string]: {} } } Content */

export default class CreateFilePlugin {
  /** @type {string} */
  #filePath;
  /** @type {string} */
  #fileName;
  /** @type {Promise<Content> | Content | (() => (Promise<Content> | Content))} */
  #content;

  /**
   * @param {string} filePath
   * @param {string} fileName
   * @param {Promise<Content> | Content | function(): (Promise<Content> | Content)} content
   */
  constructor(filePath, fileName, content) {
    this.#filePath = filePath;
    this.#fileName = fileName;
    this.#content = content;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    // the hook needs to execute after HtmlWebpackPlugin's hooks have fully completed
    compiler.hooks.done.tapPromise(CreateFilePlugin.name, async () => {
      const data = await this.#contentAsString();
      await this.#createFile(data);
    });
  }

  /** @returns {Promise<string>} */
  async #contentAsString() {
    let content = this.#content;
    if (typeof content === 'function') {
      content = content();
    }
    if (content instanceof Promise) {
      content = await content;
    }
    if (typeof content !== 'string') {
      content = JSON.stringify(content, null, 2);
    }
    return content;
  }

  /** @param {string} data */
  async #createFile(data) {
    const fullPath = path.join(this.#filePath, this.#fileName);
    const directory = path.dirname(fullPath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(fullPath, data);
  }
}
