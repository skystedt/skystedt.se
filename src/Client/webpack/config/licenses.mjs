// cSpell:ignore unfetch, cfgsync
import { LicenseWebpackPlugin as _LicenseWebpackPlugin } from 'license-webpack-plugin';
import path from 'node:path';
import spdxSatisfies from 'spdx-satisfies';
import { dir } from '../dir.mjs';

// eslint-disable-next-line import-x/order
import unfetch from 'unfetch/package.json' with { type: 'json' };

/** @typedef { import("webpack").Compiler } Compiler */
/** @typedef { NonNullable<ConstructorParameters<typeof _LicenseWebpackPlugin>[0]> } LicenseWebpackPluginOptions */
/**
 * @typedef {{
 *   new (pluginOptions?: LicenseWebpackPluginOptions) : LicenseWebpackPlugin,
 *   apply(compiler: Compiler): void
 * }} LicenseWebpackPlugin
 */
export const LicenseWebpackPlugin = /** @type {LicenseWebpackPlugin} */ (/** @type {any} */ (_LicenseWebpackPlugin));

const filename = 'THIRD-PARTY-LICENSES.txt';

const acceptableLicenses = ['MIT', 'Apache-2.0', 'ISC'];

const typeOverrides = {
  'unfetch-polyfill': unfetch.license
};

const fileOverrides = /** @type { [sourcePackage: string, targetPackage: string, file: string][] }} */ ([
  ['unfetch-polyfill', '.', 'LICENSE.md'],
  ['@microsoft/applicationinsights-cfgsync-js', '@microsoft/applicationinsights-web', 'LICENSE'],
  ['@pixi/colord', 'pixi.js', 'LICENSE']
]);

export const licensePreamble = `/*! License information is available at ${filename} */`;

/** @type {LicenseWebpackPluginOptions} */
export const licenseOptions = {
  modulesDirectories: [dir.node_modules],
  outputFilename: filename,
  unacceptableLicenseTest: (licenseType) => !!licenseType && !spdxSatisfies(licenseType, acceptableLicenses),
  licenseTypeOverrides: typeOverrides,
  licenseFileOverrides: Object.fromEntries(
    fileOverrides.map(([sourcePackage, targetPackage, file]) => [
      sourcePackage,
      path.relative(sourcePackage, path.resolve(targetPackage, file))
    ])
  ),
  perChunkOutput: false
};
