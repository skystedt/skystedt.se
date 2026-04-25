import * as licenseChecker from 'license-checker-rseidelsohn';
import spdxSatisfies from 'spdx-satisfies';
import webpack from 'webpack';

/** Check licenses from all used packages, including development and transitive dependencies */
export default class LicenseCheckUsePlugin {
  #acceptableLicenses;
  #callback;

  /**
   * @param {string[]} acceptableLicenses
   * @param {(name: string, version: string, licenseId: string) => void} [callback]
   */
  constructor(acceptableLicenses, callback) {
    this.#acceptableLicenses = acceptableLicenses;
    this.#callback = callback;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(LicenseCheckUsePlugin.name, (compilation) => {
      compilation.hooks.processAssets.tapPromise(LicenseCheckUsePlugin.name, async () => {
        await LicenseCheckUsePlugin.#checkLicenses(
          this.#logError(compilation),
          compiler.options.context,
          this.#acceptableLicenses,
          this.#callback
        );
      });
    });
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
   * @param {(name: string, version: string, licenseId: string) => void} [callback]
   */
  static async #checkLicenses(logError, baseDirectory, acceptableLicenses, callback) {
    if (!baseDirectory) {
      logError('Webpack context was not found');
      return;
    }

    const packages = await this.#resolvePackageLicenses(logError, baseDirectory);

    const invalid = this.#validateLicenses(logError, packages, acceptableLicenses);
    if (invalid.length > 0) {
      for (const { license, modules } of invalid) {
        for (const module of modules) {
          logError(`Unacceptable license used in: ${module}: ${license}`);
        }
      }
    }

    if (callback) {
      for (const [module, moduleInfo] of Object.entries(packages)) {
        const licenses = this.#simplifyLicense(moduleInfo.licenses);
        const index = module.lastIndexOf('@');
        const name = module.slice(0, index);
        const version = module.slice(index + 1);
        callback(name, version, licenses);
      }
    }
  }

  /**
   * @param {licenseChecker.ModuleInfo["licenses"]} licenses
   * @returns {string}
   */
  static #simplifyLicense(licenses) {
    if (!licenses) {
      return 'UNKNOWN';
    }
    if (Array.isArray(licenses)) {
      return licenses.join(',');
    }
    if (licenses.endsWith('*')) {
      return licenses.slice(0, -1);
    }
    return licenses;
  }

  /**
   * @param {(message: string) => void} logError
   * @param {string} baseDirectory
   * @returns {Promise<licenseChecker.ModuleInfos>}
   */
  static async #resolvePackageLicenses(logError, baseDirectory) {
    // license-checker is only used to resolve packages and their licenses
    // Some of it's methods don't do proper SPDX validation, so we do it ourselves
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
   * @param {(message: string) => void} logError
   * @param {licenseChecker.ModuleInfos} moduleInfos
   * @param {string[]} acceptableLicenses
   * @returns { { license: string; modules: string[] }[] }
   */
  static #validateLicenses(logError, moduleInfos, acceptableLicenses) {
    const groupedLicenses = this.#groupLicenses(moduleInfos);
    const invalidLicenses = [];
    for (const [license, modules] of groupedLicenses.entries()) {
      const valid = this.#validateLicense(logError, license, acceptableLicenses);
      if (!valid) {
        invalidLicenses.push({ license, modules });
      }
    }
    return invalidLicenses;
  }

  /**
   * @param {licenseChecker.ModuleInfos} moduleInfos
   * @returns {Map<string, string[]>}
   */
  static #groupLicenses(moduleInfos) {
    const grouped = new Map();
    for (const [module, { licenses }] of Object.entries(moduleInfos)) {
      const key = this.#simplifyLicense(licenses);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(module);
    }
    return grouped;
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
      return spdxSatisfies(licenseType, acceptableLicenses);
    } catch (error) {
      logError(`${error}`);
      return false;
    }
  }
}
