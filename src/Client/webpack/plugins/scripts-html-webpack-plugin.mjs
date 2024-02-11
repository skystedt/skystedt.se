import { glob } from 'glob';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { minimatch } from 'minimatch';
import webpack from 'webpack';

export default class ScriptsHtmlWebpackPlugin {
  /** @typedef {{ path: string, directory: string }} AddScript */
  /** @typedef {{ path: string, defer?: boolean, async?: boolean, type?: "module" | "nomodule" | false, integrity?: boolean }} ScriptAttributes */

  /** @type {AddScript[]} */
  #add;

  /** @type {ScriptAttributes[]} */
  #attributes;

  /** @param {{ add?: AddScript | AddScript[], attributes?: ScriptAttributes | ScriptAttributes[] }} options */
  constructor(options) {
    this.#add = /** @type {AddScript[]} */ ([]).concat(options.add || []);
    this.#attributes = /** @type {ScriptAttributes[]} */ ([]).concat(options.attributes || []);
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap('ScriptsHtmlWebpackPlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapPromise('ScriptsHtmlWebpackPlugin', async (data) => {
        await this.#addScripts(data.publicPath, data.assetTags.scripts);
        this.#updateAttributes(data.assetTags.scripts);
        return data;
      });
    });
  }

  /**
   * @param {string} path1
   * @param {string} path2
   * @returns {string}
   */
  #urlJoin(path1, path2) {
    if (!path2) {
      return path1;
    }
    if (!path1) {
      return path2;
    }
    return path1.replace(/\/+$/, '') + '/' + path2.replace(/^\/+/, '');
  }

  /**
   * @param {string} publicPath
   * @param {HtmlWebpackPlugin.HtmlTagObject[]} scripts
   */
  async #addScripts(publicPath, scripts) {
    for (const script of this.#add) {
      const files = await glob(script.path, { cwd: script.directory });
      for (const file of files) {
        const url = this.#urlJoin(publicPath, file);
        const tag = HtmlWebpackPlugin.createHtmlTagObject('script', { src: url });
        scripts.push(tag);
      }
    }
  }

  /**
   * @param {HtmlWebpackPlugin.HtmlTagObject} script
   * @param {ScriptAttributes} attributes
   * @param {keyof ScriptAttributes} attributeName
   */
  #booleanAttribute(script, attributes, attributeName) {
    if (attributes[attributeName] === true) {
      script.attributes[attributeName] = true;
    } else if (attributes[attributeName] === false) {
      script.attributes[attributeName] = undefined;
    }
  }

  /** @param {HtmlWebpackPlugin.HtmlTagObject[]} scripts */
  #updateAttributes(scripts) {
    for (const script of scripts) {
      for (const attributes of this.#attributes) {
        if (minimatch(String(script.attributes.src), attributes.path)) {
          this.#booleanAttribute(script, attributes, 'defer');
          this.#booleanAttribute(script, attributes, 'async');
          this.#booleanAttribute(script, attributes, 'integrity');
          switch (attributes.type) {
            case 'module':
              script.attributes.type = 'module';
              script.attributes.nomodule = false;
              break;
            case 'nomodule':
              script.attributes.type = false;
              script.attributes.nomodule = true;
              break;
            case false:
              script.attributes.type = false;
              script.attributes.nomodule = true;
              break;
          }
        }
      }
    }
  }
}
