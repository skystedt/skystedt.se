// cSpell:ignore picocolors, caniuse
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import updateDb from 'update-browserslist-db';
import webpack from 'webpack';

export default class BrowserslistUpdatePlugin {
  /** @type {string} */
  #nodeModules;

  /** @param {string} nodeModules */
  constructor(nodeModules) {
    this.#nodeModules = nodeModules;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.environment.tap(BrowserslistUpdatePlugin.name, () => {
      const versionBefore = BrowserslistUpdatePlugin.definitionsVersion(this.#nodeModules);

      const print = () => {}; // empty print function
      updateDb(print);

      const versionAfter = BrowserslistUpdatePlugin.definitionsVersion(this.#nodeModules);

      if (versionBefore !== versionAfter) {
        const message = pc.bold(
          pc.bgYellow(pc.black(`Browserslist (caniuse-lite) updated from ${versionBefore} to ${versionAfter}`))
        );

        console.warn(message);

        compiler.hooks.afterDone.tap(BrowserslistUpdatePlugin.name, () => {
          console.warn(message);
        });
      }
    });
  }

  /**
   * @param {string} nodeModules
   * @returns {string?}
   */
  static definitionsVersion(nodeModules) {
    const file = path.resolve(nodeModules, 'caniuse-lite', 'package.json');
    if (!fs.existsSync(file)) {
      return null;
    }
    const contents = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(contents);
    return json.version;
  }
}
