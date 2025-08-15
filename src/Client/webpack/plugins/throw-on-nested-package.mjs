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
    this.#packageArray = [packages].flat();
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    if (this.#packageArray.length > 0) {
      compiler.hooks.afterEnvironment.tap(ThrowOnNestedPackagePlugin.name, () => {
        for (const packages of this.#packageArray) {
          const [firstPackage, ...otherPackages] = [packages].flat();
          const finalPackage = otherPackages.at(-1) ?? '';

          const firstPath = path.resolve(this.#nodeModules, firstPackage, 'package.json');
          const targetPath = path.resolve(this.#nodeModules, finalPackage, 'package.json');

          let nestedPath = path.resolve(firstPath, firstPackage);
          for (const module of otherPackages) {
            const resolvedPath = resolver(nestedPath, module);
            if (resolvedPath) {
              nestedPath = resolvedPath;
            }
          }

          if (targetPath !== nestedPath) {
            throw new Error(`found nested version of '${finalPackage}' in '${firstPackage}'`);
          }
        }
      });
    }
  }
}
