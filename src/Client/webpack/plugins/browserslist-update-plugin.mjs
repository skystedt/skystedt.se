// cSpell:ignore picocolors, caniuse
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import updateDb from 'update-browserslist-db';
import webpack from 'webpack';

export default class BrowserslistUpdatePlugin {
  /** @type {string} */
  #nodeModules;
  /** @type {boolean} */
  #throwWhenOutdated;

  /**
   * @param {string} nodeModules
   * @param {boolean} throwWhenOutdated
   */
  constructor(nodeModules, throwWhenOutdated) {
    this.#nodeModules = nodeModules;
    this.#throwWhenOutdated = throwWhenOutdated;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.environment.tap(BrowserslistUpdatePlugin.name, () => {
      const versionBefore = BrowserslistUpdatePlugin.definitionsVersion(this.#nodeModules);

      const print = () => {}; // empty print function
      updateDb(print);

      const versionAfter = BrowserslistUpdatePlugin.definitionsVersion(this.#nodeModules);

      if (versionBefore !== versionAfter) {
        if (this.#throwWhenOutdated) {
          throw new Error(`Browserslist (caniuse-lite) is outdated, using: ${versionBefore}, latest: ${versionAfter}`);
        } else {
          console.warn(
            pc.bold(
              pc.bgYellow(pc.black(`Browserslist (caniuse-lite) updated from ${versionBefore} to ${versionAfter}`))
            )
          );
        }
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
