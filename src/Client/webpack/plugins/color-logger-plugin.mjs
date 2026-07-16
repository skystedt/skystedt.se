import { format } from 'node:util';
import pc from 'picocolors';
import webpack from 'webpack';

/** @typedef {Parameters<NonNullable<webpack.Compiler['infrastructureLogger']>>[1]} LogTypeEnum */

// Use the same log levels as webpack
// https://github.com/webpack/webpack/blob/v5.108.4/lib/logging/createConsoleLogger.js#L72
/** @type {Record<string, number>} */
const LogLevels = { none: 6, false: 6, error: 5, warn: 4, info: 3, log: 2, true: 2, verbose: 1 };

// Use the same prefixes as webpack
// https://github.com/webpack/webpack/blob/v5.108.4/lib/node/nodeConsole.js#L164
/**
 * @type {Partial<Record<LogTypeEnum, {
 *   prefix: string,
 *   threshold: number
 * }>>}
 */
const LogTypes = {
  error: { prefix: '<e> ', threshold: LogLevels.error },
  warn: { prefix: '<w> ', threshold: LogLevels.warn },
  info: { prefix: '<i> ', threshold: LogLevels.info },
  log: { prefix: ' '.repeat(4), threshold: LogLevels.log }
};

const CLEAR_LINE = '\u{1B}[2K\r';

export default class ColorLoggerPlugin {
  /** @type {string} */ #environment;
  /** @type {boolean} */ #append;

  /**
   * @param {string} environment
   * @param {boolean} append
   */
  constructor(environment, append) {
    this.#environment = environment;
    this.#append = append;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    const { infrastructureLogger } = compiler;
    if (!infrastructureLogger) {
      throw new Error('Compiler does not have an infrastructureLogger');
    }

    const { stream, level, debug } = compiler.options.infrastructureLogging;
    if (!stream) {
      throw new Error('Compiler does not have an infrastructureLogging stream');
    }

    if (debug) {
      // debug logging is configured, fall back to webpack's own default output
      return;
    }

    // Override the default infrastructureLogger
    compiler.infrastructureLogger = (name, type, args) =>
      this.#log(infrastructureLogger, stream, level, name, type, args);
  }

  /**
   * @param {NonNullable<webpack.Compiler['infrastructureLogger']>} infrastructureLogger
   * @param {NonNullable<webpack.Compiler['options']['infrastructureLogging']['stream']>} stream
   * @param {webpack.Compiler['options']['infrastructureLogging']['level']} level
   * @param {string} name
   * @param {LogTypeEnum} type
   * @param {unknown[] | undefined} args
   */
  #log = (infrastructureLogger, stream, level, name, type, args) => {
    // Ignore webpack.Progress logs
    if (name === 'webpack.Progress') {
      infrastructureLogger(name, type, args);
      return;
    }

    const logType = LogTypes[type];
    if (logType === undefined || !Array.isArray(args)) {
      // Ignore types we don't handle
      infrastructureLogger(name, type, args);
      return;
    }

    const loglevel = LogLevels[String(level ?? 'info')] ?? 0;
    if (loglevel > logType.threshold) {
      return;
    }

    const namedArgs =
      args.length > 0 && typeof args[0] === 'string'
        ? [`[${name}] ${args[0]}`, ...args.slice(1)]
        : [`[${name}]`, ...args];

    const environment = `[${pc.green(this.#environment)}]`;
    const message = `${logType.prefix}${format(...namedArgs)}`;

    // warn/error (and above) always persist, even in non-append mode
    if (this.#append) {
      stream.write(`${environment} ${message}\n`);
    } else {
      stream.write(`${CLEAR_LINE}${pc.bold(environment)} ${message}`);
      if (logType.threshold >= LogLevels.warn) {
        stream.write('\n');
      }
    }
  };
}
