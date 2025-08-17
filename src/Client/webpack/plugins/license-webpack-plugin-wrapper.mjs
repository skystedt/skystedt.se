import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import path from 'node:path';
import spdxSatisfies from 'spdx-satisfies';
import webpack from 'webpack';

/**
 * @typedef { NonNullable<ConstructorParameters<typeof LicenseWebpackPlugin>[0]> } LicenseWebpackPluginOptions
 * @typedef { Parameters<NonNullable<LicenseWebpackPluginOptions["renderLicenses"]>>[0][number] } LicenseIdentifiedModule
 */
/**
 * @typedef {{
 *   nodeModulesDirectory: string,
 *   filename: string,
 *   acceptableLicenses: string[],
 *   formatter?: LicenseFormatter,
 *   additionals?: string[],
 *   overrides?: {
 *     licenses?: { [sourcePackage: string]: string },
 *     files?: { [sourcePackage: string]: { module: string, file: string }},
 *     versions?: { [sourcePackage: string]: string }
 *   }
 * }} LicenseWebpackPluginWrapperOptions
 */
/** @typedef { (name: string, version: string, licenseId: string, licenseText: string) => string } LicenseFormatter */

/** Wraps LicenseWebpackPlugin, manages third-party license compliance for redistributed code */
export default class LicenseWebpackPluginWrapper {
  /** @param {LicenseWebpackPluginWrapperOptions} options */
  constructor(options) {
    const pluginOptions = LicenseWebpackPluginWrapper.#convertOptions(options);
    this.plugin = new LicenseWebpackPlugin(pluginOptions);
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    // @ts-ignore
    this.plugin.apply(compiler);
  }

  /**
   * @param {LicenseWebpackPluginWrapperOptions} options
   * @returns {LicenseWebpackPluginOptions}
   */
  static #convertOptions(options) {
    return {
      outputFilename: options.filename,
      modulesDirectories: [options.nodeModulesDirectory],
      unacceptableLicenseTest: (licenseType) =>
        !LicenseWebpackPluginWrapper.#validateLicense(licenseType, options.acceptableLicenses),
      renderLicenses: (modules) =>
        modules.reduce((file, module) => file + LicenseWebpackPluginWrapper.#renderLicence(module, options), ''),
      additionalModules: options.additionals?.map((module) => ({
        name: module,
        directory: path.resolve(options.nodeModulesDirectory, module)
      })),
      licenseTypeOverrides: options.overrides?.licenses,
      licenseFileOverrides: Object.fromEntries(
        Object.entries(options.overrides?.files ?? {}).map(([sourcePackage, { module: targetPackage, file }]) => [
          sourcePackage,
          path.relative(sourcePackage, path.resolve(targetPackage, file))
        ])
      ),
      perChunkOutput: false
    };
  }

  /**
   * @param {string} licenseType
   * @param {string[]} acceptableLicenses
   * @returns {boolean}
   */
  static #validateLicense(licenseType, acceptableLicenses) {
    if (!licenseType) {
      return false;
    }
    try {
      return spdxSatisfies(licenseType, acceptableLicenses);
    } catch (error) {
      console.error(`Error verifying license: ${error}`);
      return false;
    }
  }

  /**
   * @param {LicenseIdentifiedModule} module
   * @param {LicenseWebpackPluginWrapperOptions} options
   * @returns {string}
   */
  static #renderLicence(module, options) {
    const version = options.overrides?.versions?.[module.name] || module.packageJson?.version;
    if (!version) {
      throw new Error(`Version not found for module: ${module.name}`);
    }
    const formatter = options.formatter || LicenseWebpackPluginWrapper.#defaultFormatter;
    return formatter(module.name, version, module.licenseId || '', module.licenseText?.trim() || '');
  }

  /** @type { LicenseFormatter } */
  static #defaultFormatter(name, _, licenseId, licenseText) {
    return `${name}\n${licenseId}\n\n${licenseText}\n\n\n`;
  }
}
