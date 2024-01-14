import _babelTargets, { prettifyTargets as babelPrettifyTargets } from '@babel/helper-compilation-targets';
import bytes from 'bytes';
import { globSync } from 'glob';
import { minimatch } from 'minimatch';
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { browserslistBrowsers, dir } from './utils.mjs';
const babelTargets = /** @type {_babelTargets} */ (_babelTargets.default);

import caniuseLite from 'caniuse-lite/package.json' assert { type: 'json' };

export default class BuildInfo {
  /** @type {boolean} */
  #print;

  /** @param {boolean} print */
  constructor(print) {
    this.#print = print;
  }

  version() {
    const result = {
      built: new Date().toISOString().replace('T', ' ').replace('Z', '')
    };
    this.#prettyPrint('version', result);
    return result;
  }

  browsers() {
    const result = {
      definitions: caniuseLite.version,
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
    this.#prettyPrint('browsers', result, true);
    return result;
  }

  sizes() {
    const fileTypes = ['*.html', '*.mjs', '*.js'];

    const result = {};
    const files = globSync('**/*', { cwd: dir.dist });
    for (const file of files) {
      const filePath = path.basename(file);
      const matches = fileTypes.some((fileType) => minimatch(filePath, fileType));
      if (matches) {
        const stat = fs.statSync(path.resolve(dir.dist, file));
        const size = bytes.format(stat.size, { fixedDecimals: true, unitSeparator: ' ' });
        result[file] = size;
      }
    }

    this.#prettyPrint('sizes', result);
    return result;
  }

  /**
   * @param {string} name
   * @param {object} data
   * @param {boolean=} inspect
   */
  #prettyPrint(name, data, inspect) {
    if (this.#print) {
      if (inspect) {
        data = util.inspect(data, { depth: Infinity, colors: true, compact: 1, breakLength: Infinity });
      }
      // eslint-disable-next-line no-console
      console.log(name, data);
    }
  }

  /**
   * @param {string} environment
   * @returns {{ [string]: string[] }}
   */
  #browserslistVersions = (environment) => {
    const browsers = browserslistBrowsers(environment);
    const versions = browsers.reduce((map, value) => {
      const split = value.split(' ');
      map[split[0]] = [...(map[split[0]] || []), split[1]].sort();
      return map;
    }, {});
    return versions;
  };

  /**
   * @param {string} env
   * @returns {{[string]:string}}
   */
  #resolveBabelTargets(env) {
    return babelPrettifyTargets(babelTargets({}, { browserslistEnv: env }));
  }
}
