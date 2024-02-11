import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import updateDb from 'update-browserslist-db';
import webpack from 'webpack';

export default class BrowserslistUpdatePlugin {
  /** @type {string} */
  #node_modules;

  /** @param {string} node_modules */
  constructor(node_modules) {
    this.#node_modules = node_modules;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.environment.tap('BrowserslistUpdatePlugin', () => {
      const versionBefore = BrowserslistUpdatePlugin.definitionsVersion(this.#node_modules);

      const print = () => {}; // empty print function
      updateDb(print);

      const versionAfter = BrowserslistUpdatePlugin.definitionsVersion(this.#node_modules);

      if (versionBefore !== versionAfter) {
        console.warn(
          pc.bold(pc.bgYellow(pc.black(`Browserslist (caniuse-lite) updated from ${versionBefore} to ${versionAfter}`)))
        );
      }
    });
  }

  /**
   * @param {string} node_modules
   * @returns {string?}
   */
  static definitionsVersion(node_modules) {
    const file = path.resolve(node_modules, 'caniuse-lite', 'package.json');
    if (!fs.existsSync(file)) {
      return null;
    }
    const contents = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(contents);
    return json.version;
  }
}
