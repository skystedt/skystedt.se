import * as licenseChecker from 'license-checker-rseidelsohn';
import spdxSatisfies from 'spdx-satisfies';
import webpack from 'webpack';

/** Check licenses from all used packages, including development and transitive dependencies */
export default class LicenseCheckUsePlugin {
  #acceptableLicenses;
  #print;
  #summary = /** @type {{ [license: string]: number }} */ ({});

  /**
   * @param {string[]} acceptableLicenses
   * @param {boolean} [print] default: false
   */
  constructor(acceptableLicenses, print = false) {
    this.#acceptableLicenses = acceptableLicenses;
    this.#print = print;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(LicenseCheckUsePlugin.name, (compilation) => {
      compilation.hooks.processAssets.tapPromise(LicenseCheckUsePlugin.name, async () => {
        this.#summary = await LicenseCheckUsePlugin.#checkLicenses(
          this.#logError(compilation),
          compiler.options.context,
          this.#acceptableLicenses
        );
      });
    });
    if (this.#print) {
      compiler.hooks.afterDone.tap(LicenseCheckUsePlugin.name, () => {
        LicenseCheckUsePlugin.#logSummary(this.#summary);
      });
    }
  }

  /**
   * @param {{ errors: Error[]; }} compilation
   * @returns {(message: string) => void}
   */
  #logError(compilation) {
    return (message) => {
      compilation.errors.push(new Error(`${LicenseCheckUsePlugin.name}: ${message}`));
    };
  }

  /**
   * @param {(message: string) => void} logError
   * @param {string | undefined} baseDirectory
   * @param {string[]} acceptableLicenses
   * @returns {Promise<{ [license: string]: number }>}
   */
  static async #checkLicenses(logError, baseDirectory, acceptableLicenses) {
    if (!baseDirectory) {
      logError('Webpack context was not found');
      return {};
    }

    const packages = await LicenseCheckUsePlugin.#resolvePackageLicenses(logError, baseDirectory);
    const grouped = LicenseCheckUsePlugin.#groupLicenses(packages);

    const invalid = LicenseCheckUsePlugin.#validateLicenses(logError, grouped, acceptableLicenses);
    if (invalid.length > 0) {
      for (const { license, modules } of invalid) {
        for (const module of modules) {
          logError(`Unacceptable license used in: ${module}: ${license}`);
        }
      }
      return {};
    }

    const summary = LicenseCheckUsePlugin.#summarize(grouped);
    return summary;
  }

  /**
   * @param {(message: string) => void} logError
   * @param {any} baseDirectory
   * @returns {Promise<licenseChecker.ModuleInfos>}
   */
  static async #resolvePackageLicenses(logError, baseDirectory) {
    // Only use license-checker to resolve packages and their licenses
    // Some of its methods don't do proper SPDX validation, so we do it ourselves
    return new Promise((resolve, reject) => {
      licenseChecker.init({ start: baseDirectory }, (error, packages) => {
        if (error) {
          logError(`License checker failed: ${error}`);
          reject();
        } else {
          resolve(packages);
        }
      });
    });
  }

  /**
   * @param {licenseChecker.ModuleInfos} packages
   * @returns {Map<string, string[]>}
   */
  static #groupLicenses(packages) {
    const grouped = new Map();
    for (const [module, { licenses }] of Object.entries(packages)) {
      const key = Array.isArray(licenses) ? licenses.join(',') : licenses || 'UNKNOWN';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(module);
    }
    return grouped;
  }

  /**
   * @param {(message: string) => void} logError
   * @param {Map<string, string[]>} packages
   * @param {string[]} acceptableLicenses
   * @returns { { license: string; modules: string[] }[] }
   */
  static #validateLicenses(logError, packages, acceptableLicenses) {
    const invalidLicenses = [];
    for (const [license, modules] of packages.entries()) {
      const valid = LicenseCheckUsePlugin.#validateLicense(logError, license, acceptableLicenses);
      if (!valid) {
        invalidLicenses.push({ license, modules });
      }
    }
    return invalidLicenses;
  }

  /**
   * @param {(message: string) => void} logError
   * @param {string} licenseType
   * @param {string[]} acceptableLicenses
   * @returns {boolean}
   */
  static #validateLicense(logError, licenseType, acceptableLicenses) {
    if (!licenseType) {
      return false;
    }
    try {
      const expression = licenseType.replace(/\*?$/, '');
      return spdxSatisfies(expression, acceptableLicenses);
    } catch (error) {
      logError(`${error}`);
      return false;
    }
  }

  /**
   * @param {Map<string, string[]>} grouped
   * @returns {{ [license: string]: number }}
   */
  static #summarize(grouped) {
    return Object.fromEntries(
      [...grouped.entries()]
        .map(([license, modules]) => /** @type {[string, number]} */ ([license, modules.length]))
        .sort((a, b) => (b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]))
    );
  }

  /** @param {{ [license: string]: number }} summary */
  static #logSummary(summary) {
    if (Object.keys(summary).length > 0) {
      // eslint-disable-next-line no-console
      console.log({ licenses: summary });
    }
  }
}
