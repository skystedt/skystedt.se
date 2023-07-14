import util from 'util';
import path from 'path';
import fs from 'fs';
import bytes from 'bytes';
import enchancedResolve from 'enhanced-resolve';
import _babelTargets, { prettifyTargets as babelPrettifyTargets } from '@babel/helper-compilation-targets';
const babelTargets = /** @type {_babelTargets} */ (_babelTargets.default);
import { globSync } from 'glob';
import { minimatch } from 'minimatch';
import { dir, browserslistEnvironment } from './utils.mjs';

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
      definitions: {
        caniuse_lite: this.#resolveNestedVersion('caniuse-lite'),
        browserslist: this.#resolveNestedVersion('browserslist', 'caniuse-lite'),
        webpack: this.#resolveNestedVersion('webpack', 'browserslist', 'caniuse-lite'),
        babel: this.#resolveNestedVersion('@babel/helper-compilation-targets', 'browserslist', 'caniuse-lite'),
        babel_preset_env: this.#resolveNestedVersion('@babel/preset-env', 'browserslist', 'caniuse-lite'),
        postcss: this.#resolveNestedVersion('postcss-preset-env', 'browserslist', 'caniuse-lite')
      },
      browserslist: {
        all: browserslistEnvironment('all').versions,
        modern: browserslistEnvironment('modern').versions,
        legacy: browserslistEnvironment('legacy').versions
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
   * @param {...string} modules
   * @returns {string | false}
   */
  #resolveNestedVersion(...modules) {
    const baseJson = path.resolve(dir.node_modules, modules[modules.length - 1], 'package.json');

    let nestedJson = baseJson;
    if (modules.length > 1) {
      const resolver = enchancedResolve.create.sync({
        mainFiles: ['package'],
        extensions: ['.json'],
        enforceExtension: true
      });

      const [firstModule, ...otherModules] = modules;
      nestedJson = path.resolve(dir.node_modules, modules[0], 'package.json');
      nestedJson = path.resolve(nestedJson, firstModule);
      for (const module of otherModules) {
        nestedJson = resolver(nestedJson, module);
      }

      if (baseJson === nestedJson) {
        return false;
      }
    }

    const packageJsonString = fs.readFileSync(nestedJson, 'utf-8');
    if (!packageJsonString) {
      throw new Error(`Module not found: ${modules.join(', ')}`);
    }
    const packageJson = JSON.parse(packageJsonString);

    return packageJson.version;
  }

  /**
   * @param {string} env
   * @returns {{[string]:string}}
   */
  #resolveBabelTargets(env) {
    return babelPrettifyTargets(babelTargets({}, { browserslistEnv: env }));
  }
}
