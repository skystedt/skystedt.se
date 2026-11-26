import Arborist from '@npmcli/arborist';
import spdxSatisfies from 'spdx-satisfies';
import webpack from 'webpack';

/** @typedef {{ name: string, version: string, license: string }} UsedPackage */

/** Check licenses from all used packages, including development and transitive dependencies */
export default class LicenseCheckUsePlugin {
  #acceptableLicenses;
  #licenseOverrides;
  #callback;

  /**
   * @param {string[]} acceptableLicenses
   * @param {Record<string, string> | undefined} licenseOverrides License by package name, used instead of the package.json license field
   * @param {(name: string, version: string, licenseId: string) => void} [callback]
   */
  constructor(acceptableLicenses, licenseOverrides, callback) {
    this.#acceptableLicenses = acceptableLicenses;
    this.#licenseOverrides = new Map(Object.entries(licenseOverrides ?? {}));
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
          this.#licenseOverrides,
          this.#callback
        );
      });
    });
  }

  /**
   * @param {{ errors: Error[] }} compilation
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
   * @param {Map<string, string>} licenseOverrides
   * @param {(name: string, version: string, licenseId: string) => void} [callback]
   */
  static async #checkLicenses(logError, baseDirectory, acceptableLicenses, licenseOverrides, callback) {
    if (!baseDirectory) {
      logError('Webpack context was not found');
      return;
    }

    const packages = await this.#resolvePackages(baseDirectory, licenseOverrides);

    const invalid = this.#validateLicenses(logError, packages, acceptableLicenses);
    for (const { license, modules } of invalid) {
      for (const module of modules) {
        logError(`Unacceptable license used in: ${module}: ${license}`);
      }
    }

    if (callback) {
      for (const { name, version, license } of packages) {
        callback(name, version, license);
      }
    }
  }

  /**
   * @param {string} baseDirectory
   * @param {Map<string, string>} licenseOverrides
   * @returns {Promise<UsedPackage[]>}
   */
  static async #resolvePackages(baseDirectory, licenseOverrides) {
    const arborist = new Arborist({ path: baseDirectory });
    const tree = await arborist.loadActual();

    /** @type {Map<string, UsedPackage>} */
    const packages = new Map();
    for (const node of tree.inventory.values()) {
      if (!node.isRoot) {
        const { name, version, license } = node.package;
        packages.set(`${name}@${version}`, { name, version, license: this.#license(name, license, licenseOverrides) });
      }
    }

    return [...packages].toSorted(([a], [b]) => a.localeCompare(b)).map(([, usedPackage]) => usedPackage);
  }

  /**
   * @param {string} name
   * @param {unknown} license
   * @param {Map<string, string>} licenseOverrides
   * @returns {string}
   */
  static #license(name, license, licenseOverrides) {
    const override = licenseOverrides.get(name);
    if (override) {
      return override;
    }
    if (typeof license === 'string') {
      return license;
    }
    return 'UNKNOWN';
  }

  /**
   * @param {(message: string) => void} logError
   * @param {UsedPackage[]} packages
   * @param {string[]} acceptableLicenses
   * @returns {{
   *   license: string,
   *   modules: string[]
   * }[]}
   */
  static #validateLicenses(logError, packages, acceptableLicenses) {
    const groupedLicenses = this.#groupLicenses(packages);
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
   * @param {UsedPackage[]} packages
   * @returns {Map<string, string[]>}
   */
  static #groupLicenses(packages) {
    const grouped = new Map();
    for (const { name, version, license } of packages) {
      if (!grouped.has(license)) {
        grouped.set(license, []);
      }
      grouped.get(license)?.push(`${name}@${version}`);
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
      logError(String(error));
      return false;
    }
  }
}
