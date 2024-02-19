import enhancedResolve from 'enhanced-resolve';
import path from 'node:path';
import webpack from 'webpack';

const resolver = enhancedResolve.create.sync({
  mainFiles: ['package'],
  extensions: ['.json'],
  enforceExtension: true
});

export default class ThrowOnNestedPackagePlugin {
  /** @type {string} */
  #nodeModules;
  /** @type {string[][]} */
  #packageArray;

  /**
   * @param {string} nodeModules
   * @param {string[][]} packages
   */
  constructor(nodeModules, packages) {
    this.#nodeModules = nodeModules;
    this.#packageArray = /** @type {string[][]} */ ([]).concat(packages || []);
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    if (this.#packageArray.length > 0) {
      compiler.hooks.afterEnvironment.tap(ThrowOnNestedPackagePlugin.name, () => {
        this.#packageArray.forEach((packages) => {
          const [firstPackage, ...otherPackages] = /** @type {string[]} */ ([]).concat(packages || []);
          const finalPackage = otherPackages.at(-1) ?? '';

          const firstPath = path.resolve(this.#nodeModules, firstPackage, 'package.json');
          const targetPath = path.resolve(this.#nodeModules, finalPackage, 'package.json');

          let nestedPath = path.resolve(firstPath, firstPackage);
          otherPackages.forEach((module) => {
            const resolvedPath = resolver(nestedPath, module);
            if (!resolvedPath) {
              return;
            }
            nestedPath = resolvedPath;
          });

          if (targetPath !== nestedPath) {
            throw new Error(`found nested version of '${finalPackage}' in '${firstPackage}'`);
          }
        });
      });
    }
  }
}
