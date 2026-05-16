// cSpell:ignore picocolors
import browserslist from 'browserslist';
import { minimatch } from 'minimatch';
import path from 'node:path';
import pc from 'picocolors';

export const printProgress =
  (/** @type {string} */ environment) =>
  (/** @type {number} */ percentage, /** @type {string} */ message, /** @type {string[]} */ ...args) => {
    const percentageString = percentage
      .toLocaleString('en', { style: 'percent', minimumFractionDigits: 2 })
      .padStart('##.##%'.length, ' ');
    // eslint-disable-next-line no-console
    console.info(`[${pc.green(environment)}]`, pc.yellow(percentageString), message, ...args);
  };

/**
 * @param {string} environment
 * @returns { string[] }
 */
export const browserslistBrowsers = (environment) => {
  const browsers = browserslist(null, { env: environment });
  return browsers;
};

/**
 * @param {string} parentPath
 * @param {string} subPath
 * @returns {boolean}
 */
export const isSubPath = (parentPath, subPath) =>
  !!subPath && minimatch(subPath, path.resolve(parentPath, '**'), { windowsPathsNoEscape: true });
