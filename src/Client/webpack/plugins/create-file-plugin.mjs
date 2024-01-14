import path from 'node:path';
import fs from 'node:fs/promises';
import webpack from 'webpack';

export default class CreateFilePlugin {
  /** @type {string} */
  #filePath;
  /** @type {string} */
  #fileName;
  /** @type {string | object | Function<string | object>} */
  #content;

  /**
   * @param {string} filePath
   * @param {string} fileName
   * @param {string | object | Function<string | object>} content
   */
  constructor(filePath, fileName, content) {
    this.#filePath = filePath;
    this.#fileName = fileName;
    this.#content = content;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    // the hook needs to execute after HtmlWebpackPlugin's hooks have fully completed
    compiler.hooks.done.tapPromise('CreateFilePlugin', async () => {
      const data = this.#contentAsString();
      await this.#createFile(data);
    });
  }

  /** @returns {string} */
  #contentAsString() {
    let content = this.#content;
    if (typeof content === 'function') {
      content = this.#content();
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
