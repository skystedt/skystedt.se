import pc from 'picocolors';
import webpack from 'webpack';

/** @typedef { ReturnType<webpack.Compiler["getInfrastructureLogger"]>["status"] } WebpackLogger */
/** @typedef { ReturnType<webpack.ProgressPlugin.createDefaultHandler> } ProgressPluginHandler */
/** @typedef { (compiler: webpack.Compiler, handler: ProgressPluginHandler) => void } ProgressPluginApply  */

export default class ColorProgressPlugin {
  /** @type {string} */ #environment;
  /** @type {boolean} */ #append;
  /** @type {webpack.ProgressPlugin} */ #plugin;
  /** @type {WebpackLogger | undefined} */ #logger;

  /**
   * @param {string} environment
   * @param {boolean} append
   */
  constructor(environment, append) {
    this.#environment = environment;
    this.#append = append;

    const options = {
      handler: this.#handler
    };
    this.#plugin = new webpack.ProgressPlugin(options);
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    const infrastructureLogger = compiler.getInfrastructureLogger('webpack.Progress');
    this.#logger = this.#append // eslint-disable-next-line no-console
      ? console.info
      : infrastructureLogger.status.bind(infrastructureLogger);

    this.#plugin.apply(compiler);
  }

  /** @type {ProgressPluginHandler} */
  #handler = (percentage, message, ...args) => {
    if (!this.#logger) {
      throw new Error('Logger is not initialized');
    }

    const percentageString = percentage
      .toLocaleString('en', { style: 'percent', minimumFractionDigits: 2 })
      .padStart('##.##%'.length, ' ');

    this.#logger(`[${pc.green(this.#environment)}]`, pc.yellow(percentageString), message, ...args);

    // Use the same logic as webpack.ProgressPlugin for empty lines
    if (percentage === 1 || (!message && args.length === 0)) {
      this.#logger();
    }
  };
}
