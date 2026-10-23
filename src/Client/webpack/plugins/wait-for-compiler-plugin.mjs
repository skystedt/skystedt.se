import webpack from 'webpack';

export default class WaitForCompilerPlugin {
  /** @type {string} */
  #name;
  /** @type {string} */
  #dependencyName;

  /**
   * @param {string} [configName]
   * @param {string} [dependencyConfigName]
   */
  constructor(configName, dependencyConfigName) {
    if (!configName || !dependencyConfigName) {
      throw new Error('Configuration must have a name, it is used to find its compiler');
    }
    this.#name = configName;
    this.#dependencyName = dependencyConfigName;
  }

  /** @param {webpack.MultiCompiler} multiCompiler */
  apply(multiCompiler) {
    const compiler = this.#findCompiler(multiCompiler, this.#name);
    const dependency = this.#findCompiler(multiCompiler, this.#dependencyName);

    let dependencyDone = /** @type {PromiseWithResolvers<void>} */ (Promise.withResolvers());
    let dependencyRunning = true;
    let dependencyBuilds = 0;
    let usedDependencyBuild = 0;
    let running = false;

    const rebuildIfOutdated = () => {
      if (!running && !dependencyRunning && usedDependencyBuild !== dependencyBuilds) {
        compiler.watching?.invalidate();
      }
    };

    const dependencyStarted = () => {
      if (dependencyRunning) {
        return;
      }
      dependencyRunning = true;
      dependencyDone = Promise.withResolvers();
    };

    const dependencyFinished = () => {
      dependencyRunning = false;
      dependencyDone.resolve();
    };

    dependency.hooks.invalid.tap(WaitForCompilerPlugin.name, dependencyStarted);
    dependency.hooks.run.tap(WaitForCompilerPlugin.name, dependencyStarted);
    dependency.hooks.watchRun.tap(WaitForCompilerPlugin.name, dependencyStarted);
    dependency.hooks.done.tap(WaitForCompilerPlugin.name, () => {
      dependencyBuilds += 1;
      dependencyFinished();
      rebuildIfOutdated();
    });
    // don't keep the compiler waiting when the dependency fails (reported by the MultiCompiler)
    dependency.hooks.failed.tap(WaitForCompilerPlugin.name, dependencyFinished);
    // or when its watching is closed before it's done, then neither done nor failed is called
    dependency.hooks.watchClose.tap(WaitForCompilerPlugin.name, dependencyFinished);

    compiler.hooks.run.tap(WaitForCompilerPlugin.name, () => {
      running = true;
    });
    compiler.hooks.watchRun.tap(WaitForCompilerPlugin.name, () => {
      running = true;
    });
    compiler.hooks.done.tap(WaitForCompilerPlugin.name, () => {
      running = false;
      rebuildIfOutdated();
    });
    compiler.hooks.failed.tap(WaitForCompilerPlugin.name, () => {
      running = false;
    });

    compiler.hooks.thisCompilation.tap(WaitForCompilerPlugin.name, (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: WaitForCompilerPlugin.name,
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
        },
        async () => {
          await dependencyDone.promise;
          usedDependencyBuild = dependencyBuilds;
        }
      );
    });
  }

  /**
   * @param {webpack.MultiCompiler} multiCompiler
   * @param {string} name
   * @returns {webpack.Compiler}
   */
  #findCompiler(multiCompiler, name) {
    const compiler = multiCompiler.compilers.find((child) => child.name === name);
    if (!compiler) {
      throw new Error(`Compiler '${name}' was not found`);
    }
    return compiler;
  }
}
