// cSpell:ignore unfetch, cfgsync

import unfetch from 'unfetch/package.json' with { type: 'json' };

/** @typedef { import('../plugins/license-webpack-plugin-wrapper.mjs').LicenseWebpackPluginWrapperOptions["overrides"] } LicenseOverrides */
/** @typedef { import('../plugins/license-webpack-plugin-wrapper.mjs').LicenseFormatter } LicenseFormatter */

export const licenseFilename = 'THIRD-PARTY-LICENSES.txt';
export const licensePreamble = `/*! License information in ${licenseFilename} */`;

export const licenseAcceptable = {
  // Results in "ERROR in license-webpack-plugin: unacceptable license found for ..."
  redistributed: [
    'MIT', //           https://www.tldrlegal.com/license/mit-license
    'ISC', //           https://www.tldrlegal.com/license/isc-license
    'Apache-2.0' //     https://www.tldrlegal.com/license/apache-license-2-0-apache-2-0
  ],
  // Results in " ERROR in LicenseCheckUsePlugin: Unacceptable license used in: ..."
  used: [
    'MIT', //           https://www.tldrlegal.com/license/mit-license
    'MIT-0', //         https://opensource.org/license/mit-0
    'ISC', //           https://www.tldrlegal.com/license/isc-license
    'Apache-2.0', //    https://www.tldrlegal.com/license/apache-license-2-0-apache-2-0
    '0BSD', //          https://www.tldrlegal.com/license/bsd-0-clause-license
    'BSD-2-Clause', //  https://www.tldrlegal.com/license/bsd-2-clause-license-freebsd
    'BSD-3-Clause', //  https://www.tldrlegal.com/license/bsd-3-clause-license-revised
    'CC0-1.0', //       https://www.tldrlegal.com/license/creative-commons-cc0-1-0-universal
    'CC-BY-3.0', //     https://www.tldrlegal.com/license/creative-commons-attribution-cc
    'CC-BY-4.0', //     https://www.tldrlegal.com/license/creative-commons-attribution-4-0-international-cc-by-4
    'Python-2.0', //    https://www.tldrlegal.com/license/python-license-2-0
    'LGPL-3.0-only', // https://www.tldrlegal.com/license/gnu-lesser-general-public-license-v3-lgpl-3
    'BlueOak-1.0.0' //  https://opensource.org/license/blue-oak-model-license
  ]
};

// Manually add modules that are not explicitly referenced but used in runtime/added by the build process
export const licenseAdditionals = {
  /** @type {string[]} */
  modern: ['webpack'],
  /** @type {string[]} */
  legacy: ['webpack', '@babel/plugin-transform-regenerator', 'regenerator-runtime']
};

/** @type {LicenseOverrides} */
export const licenseOverrides = {
  licenses: {
    'unfetch-polyfill': unfetch.license
  },
  files: {
    'unfetch-polyfill': { module: '.', file: 'LICENSE.md' },
    '@microsoft/applicationinsights-cfgsync-js': { module: '@microsoft/applicationinsights-web', file: 'LICENSE' },
    '@pixi/colord': { module: 'pixi.js', file: 'LICENSE' }
  },
  versions: {
    'unfetch-polyfill': unfetch.version
  }
};

/** @type { LicenseFormatter } */
export const licenseFormatter = (name, version, licenseId, licenseText) =>
  `${name} v${version}\n${licenseId}\n\n${licenseText}\n\n----------\n\n`;
