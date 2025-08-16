// cSpell:ignore unfetch, cfgsync
import { LicenseWebpackPlugin as _LicenseWebpackPlugin } from 'license-webpack-plugin';
import path from 'node:path';
import spdxSatisfies from 'spdx-satisfies';
import { dir } from '../dir.mjs';

// eslint-disable-next-line import-x/order
import unfetch from 'unfetch/package.json' with { type: 'json' };

/** @typedef { import("webpack").Compiler } Compiler */
/** @typedef { Parameters<NonNullable<LicenseWebpackPluginOptions["renderLicenses"]>>[0][number] } LicenseIdentifiedModule */
/** @typedef { NonNullable<LicenseWebpackPluginOptions["additionalModules"]>[number] } LicenseAdditionalModule */
/** @typedef { NonNullable<ConstructorParameters<typeof _LicenseWebpackPlugin>[0]> } LicenseWebpackPluginOptions */
/**
 * @typedef {{
 *   new (pluginOptions?: LicenseWebpackPluginOptions) : LicenseWebpackPlugin,
 *   apply(compiler: Compiler): void
 * }} LicenseWebpackPlugin
 */

/** @type {LicenseWebpackPlugin} */
// eslint-disable-next-line unicorn/prefer-export-from
export const LicenseWebpackPlugin = /** @type {any} */ (_LicenseWebpackPlugin);

const filename = 'THIRD-PARTY-LICENSES.txt';

const acceptableLicenses = ['MIT', 'Apache-2.0', 'ISC'];

// Manually add modules that are not explicitly referenced but used in runtime/added by the build process
export const additionalModules = {
  /** @type {LicenseAdditionalModule[]} */
  modern: [
    {
      name: 'webpack',
      directory: path.resolve(dir.node_modules, 'webpack')
    }
  ],
  /** @type {LicenseAdditionalModule[]} */
  legacy: [
    {
      name: 'webpack',
      directory: path.resolve(dir.node_modules, 'webpack')
    },
    {
      name: '@babel/plugin-transform-regenerator',
      directory: path.resolve(dir.node_modules, '@babel/plugin-transform-regenerator')
    },
    {
      name: 'regenerator-runtime',
      directory: path.resolve(dir.node_modules, 'regenerator-runtime')
    }
  ]
};

/** @type {{ [sourcePackage: string]: string }} */
const typeOverrides = {
  'unfetch-polyfill': unfetch.license
};

/** @type { [sourcePackage: string, targetPackage: string, file: string][] } */
const fileOverrides = [
  ['unfetch-polyfill', '.', 'LICENSE.md'],
  ['@microsoft/applicationinsights-cfgsync-js', '@microsoft/applicationinsights-web', 'LICENSE'],
  ['@pixi/colord', 'pixi.js', 'LICENSE']
];

/** @type {{ [sourcePackage: string]: string }} */
const versionOverrides = {
  'unfetch-polyfill': unfetch.version
};

export const licensePreamble = `/*! License information in ${filename} */`;

const renderLicence = (/** @type {LicenseIdentifiedModule} */ module) => {
  const version = versionOverrides[module.name] || module.packageJson?.version;
  if (!version) {
    throw new Error(`Version not found for module: ${module.name}`);
  }
  return `${module.name} v${version}\n${module.licenseId}\n\n${module.licenseText?.trim()}\n\n----------\n\n`;
};

/** @type {LicenseWebpackPluginOptions} */
export const licenseOptions = {
  outputFilename: filename,
  modulesDirectories: [dir.node_modules],
  unacceptableLicenseTest: (licenseType) => !!licenseType && !spdxSatisfies(licenseType, acceptableLicenses),
  renderLicenses: (modules) => modules.reduce((file, module) => file + renderLicence(module), ''),
  licenseTypeOverrides: typeOverrides,
  licenseFileOverrides: Object.fromEntries(
    fileOverrides.map(([sourcePackage, targetPackage, file]) => [
      sourcePackage,
      path.relative(sourcePackage, path.resolve(targetPackage, file))
    ])
  ),
  perChunkOutput: false
};
