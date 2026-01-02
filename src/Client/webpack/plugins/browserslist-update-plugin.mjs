// cSpell:ignore picocolors, caniuse
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import updateDb from 'update-browserslist-db';
import webpack from 'webpack';

/** @enum {string} */
export const BrowserslistUpdateDependency = {
  CaniuseLite: 'caniuse-lite',
  Baseline: 'baseline-browser-mapping'
};

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
      const versionBeforeCaniuse = BrowserslistUpdatePlugin.definitionsVersion(
        this.#nodeModules,
        BrowserslistUpdateDependency.CaniuseLite
      );
      const versionBeforeBaseline = BrowserslistUpdatePlugin.definitionsVersion(
        this.#nodeModules,
        BrowserslistUpdateDependency.Baseline
      );

      const print = () => {}; // empty print function
      updateDb(print);

      const versionAfterCaniuse = BrowserslistUpdatePlugin.definitionsVersion(
        this.#nodeModules,
        BrowserslistUpdateDependency.CaniuseLite
      );
      const versionAfterBaseline = BrowserslistUpdatePlugin.definitionsVersion(
        this.#nodeModules,
        BrowserslistUpdateDependency.Baseline
      );

      if (versionBeforeCaniuse !== versionAfterCaniuse || versionBeforeBaseline !== versionAfterBaseline) {
        const message = pc.bold(
          pc.bgYellow(
            pc.black(
              `Browserslist updated, caniuse-lite from ${versionBeforeCaniuse} to ${versionAfterCaniuse}, baseline-browser-mapping from ${versionBeforeBaseline} to ${versionAfterBaseline}`
            )
          )
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
   * @param {BrowserslistUpdateDependency} dependency
   * @returns {string?}
   */
  static definitionsVersion(nodeModules, dependency) {
    const file = path.resolve(nodeModules, dependency, 'package.json');
    if (!fs.existsSync(file)) {
      return null;
    }
    const contents = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(contents);
    return json.version;
  }
}
