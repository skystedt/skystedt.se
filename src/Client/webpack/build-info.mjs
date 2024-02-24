import _babelTargets, { prettifyTargets as babelPrettifyTargets } from '@babel/helper-compilation-targets';
import bytes from 'bytes';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import fs from 'node:fs/promises';
import path from 'node:path';
import BrowserslistUpdatePlugin from './plugins/browserslist-update-plugin.mjs';
import { browserslistBrowsers, dir } from './utils.mjs';

const babelTargets = /** @type {_babelTargets} */ (/** @type {any} */ (_babelTargets).default);

export default class BuildInfo {
  /** @typedef {{ built: string }} Version */
  /**
   * @template T
   * @typedef {{ all: T, modern: T, legacy: T }} Environments
   */
  /**
   * @typedef {{ [browser: string]: string[] }} BrowserVersions
   * @typedef {{ [target: string]: string }} BabelTargets
   * @typedef {{ definitions: string, browserslist: Environments<BrowserVersions>, babel: Environments<BabelTargets> }} Browsers
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
    const definitionsVersion = BrowserslistUpdatePlugin.definitionsVersion(dir.node_modules);
    const result = {
      definitions: definitionsVersion ?? '?',
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
    const fileTypes = ['*.html', '*.mjs', '*.js'];

    const result = /** @type {Sizes} */ ({});
    const files = await glob('**/*', { cwd: dir.dist });
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.basename(file);
        const matches = fileTypes.some((fileType) => minimatch(filePath, fileType));
        if (matches) {
          const stat = await fs.stat(path.resolve(dir.dist, file));
          const size = bytes.format(stat.size, { fixedDecimals: true, unitSeparator: ' ' });
          result[file] = size;
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
    const versions = browsers.reduce((map, value) => {
      const split = value.split(' ');
      map[split[0]] = [...(map[split[0]] || []), split[1]].sort();
      return map;
    }, /** @type {BrowserVersions} */ ({}));
    return versions;
  };

  /**
   * @param {string} env
   * @returns {BabelTargets}
   */
  #resolveBabelTargets(env) {
    return babelPrettifyTargets(babelTargets({}, { browserslistEnv: env }));
  }
}
