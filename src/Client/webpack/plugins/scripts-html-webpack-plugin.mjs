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
    compiler.hooks.compilation.tap(ScriptsHtmlWebpackPlugin.name, (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapPromise(ScriptsHtmlWebpackPlugin.name, async (data) => {
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
    const p1 = path1.replace(/\/+$/, '');
    const p2 = path2.replace(/^\/+/, '');
    return `${p1}/${p2}`;
  }

  /**
   * @param {string} publicPath
   * @param {HtmlWebpackPlugin.HtmlTagObject[]} scripts
   */
  async #addScripts(publicPath, scripts) {
    await Promise.all(
      this.#add.map(async (script) => {
        const files = await glob(script.path, { cwd: script.directory });
        files.forEach((file) => {
          const url = this.#urlJoin(publicPath, file);
          const tag = HtmlWebpackPlugin.createHtmlTagObject('script', { src: url });
          scripts.push(tag);
        });
      })
    );
  }

  /**
   * @param {HtmlWebpackPlugin.HtmlTagObject} script
   * @param {ScriptAttributes} newAttributes
   * @param {keyof ScriptAttributes} attributeName
   */
  #booleanAttribute(script, newAttributes, attributeName) {
    const { attributes } = script;
    if (newAttributes[attributeName] === true) {
      attributes[attributeName] = true;
    } else if (newAttributes[attributeName] === false) {
      attributes[attributeName] = undefined;
    }
  }

  /**
   * @param {HtmlWebpackPlugin.HtmlTagObject} script
   * @param {ScriptAttributes} newAttributes
   */
  #moduleAttribute(script, newAttributes) {
    const { attributes } = script;
    switch (newAttributes.type) {
      case 'module':
        attributes.type = 'module';
        attributes.nomodule = false;
        break;
      case 'nomodule':
        attributes.type = false;
        attributes.nomodule = true;
        break;
      case false:
        attributes.type = false;
        attributes.nomodule = true;
        break;
      default:
      // do nothing
    }
  }

  /** @param {HtmlWebpackPlugin.HtmlTagObject[]} scripts */
  #updateAttributes(scripts) {
    scripts.forEach((script) => {
      this.#attributes.forEach((newAttributes) => {
        if (minimatch(String(script.attributes.src), newAttributes.path)) {
          this.#booleanAttribute(script, newAttributes, 'defer');
          this.#booleanAttribute(script, newAttributes, 'async');
          this.#booleanAttribute(script, newAttributes, 'integrity');
          this.#moduleAttribute(script, newAttributes);
        }
      });
    });
  }
}
