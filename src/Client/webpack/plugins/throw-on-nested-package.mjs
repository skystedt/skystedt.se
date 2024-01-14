import enchancedResolve from 'enhanced-resolve';
import path from 'node:path';
import webpack from 'webpack';

const resolver = enchancedResolve.create.sync({
  mainFiles: ['package'],
  extensions: ['.json'],
  enforceExtension: true
});

export default class ThrowOnNestedPackagePlugin {
  #node_modules;
  #packageArray;

  /**
   * @param {string} node_modules
   * @param {...string[]} packages
   */
  constructor(node_modules, packages) {
    this.#node_modules = node_modules;
    this.#packageArray = [].concat(packages || []);
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    if (this.#packageArray.length > 0) {
      compiler.hooks.afterEmit.tapPromise('ThrowOnNestedPackagePlugin', async () => {
        for (const packages of this.#packageArray) {
          const [firstPackage, ...otherPackages] = [].concat(packages || []);
          const finalPackage = otherPackages.at(-1);

          const firstPath = path.resolve(this.#node_modules, firstPackage, 'package.json');
          const targetPath = path.resolve(this.#node_modules, finalPackage, 'package.json');

          let nestedPath = path.resolve(firstPath, firstPackage);
          for (const module of otherPackages) {
            nestedPath = resolver(nestedPath, module);
          }

          if (targetPath !== nestedPath) {
            throw new Error(`found nested version of '${finalPackage}' in '${firstPackage}'`);
          }
        }
      });
    }
  }
}
