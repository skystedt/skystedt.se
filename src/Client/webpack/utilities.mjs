import browserslist from 'browserslist';
import { minimatch } from 'minimatch';
import path from 'node:path';

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
