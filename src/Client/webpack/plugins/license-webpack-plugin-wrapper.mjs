import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import path from 'node:path';
import spdxSatisfies from 'spdx-satisfies';
import webpack from 'webpack';

/**
 * @typedef {NonNullable<ConstructorParameters<typeof LicenseWebpackPlugin>[0]>} LicenseWebpackPluginOptions
 * @typedef {Parameters<NonNullable<LicenseWebpackPluginOptions["renderLicenses"]>>[0][number]} LicenseIdentifiedModule
 * @typedef {NonNullable<LicenseWebpackPluginOptions["additionalModules"]>} AdditionalModules
 */
/** @typedef {webpack.Module & { modules?: webpack.Module[] }} ConcatenatedModule */
/**
 * @typedef {{
 *   nodeModulesDirectory: string,
 *   filename: string,
 *   acceptableLicenses: string[],
 *   formatter?: LicenseFormatter,
 *   additionals?: string[],
 *   overrides?: {
 *   licenses?: { [sourcePackage: string]: string },
 *   files?: { [sourcePackage: string]: {
 *   module: string,
 *   file: string
 * } },
 *   versions?: { [sourcePackage: string]: string }
 * },
 *   callback?: (name: string, version: string, licenseId: string) => void
 * }} LicenseWebpackPluginWrapperOptions
 */
/** @typedef {(name: string, version: string, licenseId: string, licenseText: string) => string} LicenseFormatter */

/** Wraps LicenseWebpackPlugin, manages third-party license compliance for redistributed code */
export default class LicenseWebpackPluginWrapper {
  /** @type {LicenseWebpackPlugin} */
  #plugin;

  /** @type {AdditionalModules} */
  #additionalModules;

  /** @type {number} */
  #configuredModulesCount;

  /** @type {string} */
  #nodeModulesDirectory;

  /** @param {LicenseWebpackPluginWrapperOptions} options */
  constructor(options) {
    const pluginOptions = LicenseWebpackPluginWrapper.#convertOptions(options);
    // the plugin keeps the array and reads it when the licenses are rendered, see #registerBundledModules
    pluginOptions.additionalModules ??= [];
    this.#additionalModules = pluginOptions.additionalModules;
    this.#configuredModulesCount = this.#additionalModules.length;
    this.#nodeModulesDirectory = options.nodeModulesDirectory;
    this.#plugin = new LicenseWebpackPlugin(pluginOptions);
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(LicenseWebpackPluginWrapper.name, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: LicenseWebpackPluginWrapper.name,
          // the licenses are rendered at PROCESS_ASSETS_STAGE_REPORT, the modules have to be registered before that
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT - 1
        },
        () => this.#registerBundledModules(compilation)
      );
    });

    // @ts-expect-error TS2345
    this.#plugin.apply(compiler);
  }

  /**
   * Scope hoisted (concatenated) modules are only found through the stats,
   * where their identifier is prefixed with the module type (e.g. "javascript/esm|<file>"),
   * which the plugin can't resolve to a package, silently omitting the package from the licenses,
   * so every bundled package is registered manually
   * (the plugin registers packages by name, already known packages are ignored)
   * @param {webpack.Compilation} compilation
   * @returns {void}
   */
  #registerBundledModules(compilation) {
    // the array is reused between compilations (watch mode), only keep the configured modules
    this.#additionalModules.splice(this.#configuredModulesCount);

    const nodeModulesDirectory = path.resolve(this.#nodeModulesDirectory);
    const registered = new Set(this.#additionalModules.map((module) => module.name));

    /**
     * @param {webpack.Module} module
     * @returns {void}
     */
    const register = (module) => {
      const resolved = /** @type {webpack.NormalModule} */ (module).resourceResolveData;
      const directory = resolved?.descriptionFileRoot;
      const name = resolved?.descriptionFileData?.name;
      if (!directory || typeof name !== 'string' || registered.has(name)) {
        return;
      }
      if (!path.resolve(directory).startsWith(nodeModulesDirectory)) {
        return;
      }
      registered.add(name);
      this.#additionalModules.push({ name, directory });
    };

    for (const chunk of compilation.chunks) {
      for (const chunkModule of compilation.chunkGraph.getChunkModulesIterable(chunk)) {
        register(chunkModule);
        const innerModules = /** @type {ConcatenatedModule} */ (chunkModule).modules ?? [];
        for (const innerModule of innerModules) {
          register(innerModule);
        }
      }
    }
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

    const licenseId = module.licenseId || '';

    const formatter = options.formatter || LicenseWebpackPluginWrapper.#defaultFormatter;
    const formattedLicense = formatter(module.name, version, licenseId, module.licenseText?.trim() || '');

    options.callback?.(module.name, version, licenseId);

    return formattedLicense;
  }

  /** @type {LicenseFormatter} */
  static #defaultFormatter(name, _, licenseId, licenseText) {
    return `${name}\n${licenseId}\n\n${licenseText}\n\n\n`;
  }
}
