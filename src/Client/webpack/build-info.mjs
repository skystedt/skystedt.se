import babelTargets, { prettifyTargets as babelPrettifyTargets } from '@babel/helper-compilation-targets';
import bytes from 'bytes';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dir } from './dir.mjs';
import BrowserslistUpdatePlugin, { BrowserslistUpdateDependency } from './plugins/browserslist-update-plugin.mjs';
import { browserslistBrowsers } from './utilities.mjs';

export default class BuildInfo {
  /** @typedef {{ built: string }} Version */
  /**
   * @template T
   * @typedef {{ all: T, modern: T, legacy: T }} Environments
   */
  /**
   * @typedef {{ [browser: string]: string[] }} BrowserVersions
   * @typedef {{ [target: string]: string }} BabelTargets
   * @typedef {{ "caniuse-lite": string, "baseline-browser-mapping": string, browserslist: Environments<BrowserVersions>, babel: Environments<BabelTargets> }} Browsers
   */
  /** @typedef {{ [file: string]: string }} Sizes */

  /** @type {{ version?: Version, browsers?: Browsers, sizes?: Sizes }} */
  #resolved = {
    version: undefined,
    browsers: undefined,
    sizes: undefined
  };

  get resolved() {
    return this.#resolved;
  }

  /** @returns {Version} */
  version() {
    const result = {
      built: new Date().toISOString().replace('T', ' ').replace('Z', '')
    };

    this.#resolved.version = result;
    return result;
  }

  /** @returns {Browsers} */
  browsers() {
    const definitionsCaniuseLite = BrowserslistUpdatePlugin.definitionsVersion(
      dir.node_modules,
      BrowserslistUpdateDependency.CaniuseLite
    );
    const definitionsBaselineBrowserMapping = BrowserslistUpdatePlugin.definitionsVersion(
      dir.node_modules,
      BrowserslistUpdateDependency.Baseline
    );
    const result = {
      'caniuse-lite': definitionsCaniuseLite ?? '?',
      'baseline-browser-mapping': definitionsBaselineBrowserMapping ?? '?',
      browserslist: {
        all: this.#browserslistVersions('all'),
        modern: this.#browserslistVersions('modern'),
        legacy: this.#browserslistVersions('legacy')
      },
      babel: {
        all: this.#resolveBabelTargets('all'),
        modern: this.#resolveBabelTargets('modern'),
        legacy: this.#resolveBabelTargets('legacy')
      }
    };

    this.#resolved.browsers = result;
    return result;
  }

  /** @returns {Promise<Sizes>} */
  async sizes() {
    const fileTypes = new Set(['.html', '.mjs', '.js']);

    const relativePaths = await fs.readdir(dir.dist, { recursive: true });

    const result = /** @type {Sizes} */ ({});
    await Promise.all(
      relativePaths.map(async (relativePath) => {
        if (fileTypes.has(path.extname(relativePath))) {
          const fullPath = path.resolve(dir.dist, relativePath);
          const stat = await fs.stat(fullPath);
          const size = bytes.format(stat.size, { fixedDecimals: true, unitSeparator: ' ' }) ?? '?';
          result[relativePath] = size;
        }
      })
    );

    this.#resolved.sizes = result;
    return result;
  }

  /**
   * @param {string} environment
   * @returns {BrowserVersions}
   */
  #browserslistVersions = (environment) => {
    const browsers = browserslistBrowsers(environment);
    const versions = /** @type {BrowserVersions} */ ({});
    for (const browser of browsers) {
      const [name, version] = browser.split(' ');
      versions[name] = [...(versions[name] || []), version].toSorted();
    }
    return versions;
  };

  /**
   * @param {string} environment
   * @returns {BabelTargets}
   */
  #resolveBabelTargets(environment) {
    return babelPrettifyTargets(babelTargets({}, { browserslistEnv: environment }));
  }
}
