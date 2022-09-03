/* eslint-env node */
const path = require('path');
const fs = require('fs');
const structuredClone = require('core-js/stable/structured-clone.js');
const enchancedResolve = require('enhanced-resolve');
const minimatch = require('minimatch');
const glob = require('glob');
const browserslist = require('browserslist');
const bytes = require('bytes');
const { default: babelTargets, prettifyTargets: babelPrettifyTargets } = require('@babel/helper-compilation-targets');
const HtmlWebpackPlugin = require('html-webpack-plugin');
/** @typedef { import("webpack").Compiler } Compiler */
/** @typedef { import("webpack").RuleSetRule } RuleSetRule */
/** @typedef { import("webpack").WebpackPluginInstance } WebpackPluginInstance */
/** @typedef { import("@babel/core").TransformOptions } BabelTransformOptions */
/** @typedef { import("html-webpack-plugin").HtmlTagObject } HtmlTagObject */
/** @typedef { import("postcss").PluginCreator } PostcssPluginCreator */
/** @typedef { import("postcss").Root } PostcssRoot */
/** @typedef { import("postcss").Node } PostcssNode */

const dir = {
  root: path.resolve(__dirname),
  src: path.resolve(__dirname, 'src'),
  dist: path.resolve(__dirname, 'dist'),
  node_modules: path.resolve(__dirname, 'node_modules')
};

class ScriptsHtmlWebpackPlugin {
  /** @typedef {{ path: string, directory: string }} AddScript */
  /** @typedef {{ path: string, defer?: boolean, async?: boolean, type?: "module" | "nomodule" | false }} ScriptAttributes */

  /** @type {AddScript[]} */
  #add;

  /** @type {ScriptAttributes[]} */
  #attributes;

  /** @param {{ add?: AddScript | AddScript[], attributes?: ScriptAttributes | ScriptAttributes[] }} options */
  constructor(options) {
    this.#add = [].concat(options.add || []);
    this.#attributes = [].concat(options.attributes || []);
  }

  /** @param {Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap('ScriptsHtmlWebpackPlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync('ScriptsHtmlWebpackPlugin', async (data, cb) => {
        await this.#addScripts(data.publicPath, data.assetTags.scripts);
        this.#updateAttributes(data.assetTags.scripts);
        cb(null, data);
      });
    });
  }

  /**
   * @param {string} path1
   * @param {string} path2
   * @returns {string}
   */
  #urlJoin(path1, path2) {
    if (!path2) {
      return path1;
    }
    if (!path1) {
      return path2;
    }
    return path1.replace(/\/+$/, '') + '/' + path2.replace(/^\/+/, '');
  }

  /**
   * @param {string} publicPath
   * @param {HtmlTagObject[]} scripts
   */
  async #addScripts(publicPath, scripts) {
    for (const script of this.#add) {
      const files = glob.sync(script.path, { cwd: script.directory });
      for (const file of files) {
        const url = this.#urlJoin(publicPath, file);
        const tag = HtmlWebpackPlugin.createHtmlTagObject('script', { src: url });
        scripts.push(tag);
      }
    }
  }

  /**
   * @param {HtmlTagObject} script
   * @param {ScriptAttributes} attributes
   * @param {string} attributeName
   */
  #booleanAttribute(script, attributes, attributeName) {
    if (attributes[attributeName] === true) {
      script.attributes[attributeName] = true;
    } else if (attributes[attributeName] === false) {
      script.attributes[attributeName] = undefined;
    }
  }

  /** @param {HtmlTagObject[]} scripts */
  #updateAttributes(scripts) {
    for (const script of scripts) {
      for (const attributes of this.#attributes) {
        if (minimatch(script.attributes.src, attributes.path)) {
          this.#booleanAttribute(script, attributes, 'defer');
          this.#booleanAttribute(script, attributes, 'async');
          switch (attributes.type) {
            case 'module':
              script.attributes.type = 'module';
              script.attributes.nomodule = false;
              break;
            case 'nomodule':
              script.attributes.type = false;
              script.attributes.nomodule = true;
              break;
            case false:
              script.attributes.type = false;
              script.attributes.nomodule = true;
              break;
          }
        }
      }
    }
  }
}

class ThrowOnAssetsEmitedWebpackPlugin {
  #patterns;

  /** @param {...string} patterns */
  constructor(...patterns) {
    this.#patterns = [].concat(patterns || []);
  }

  /** @param {Compiler} compiler */
  apply(compiler) {
    compiler.hooks.afterEmit.tap('ThrowOnAssetsEmitedWebpackPlugin', () => {
      const found = [];
      for (const pattern of this.#patterns) {
        const files = glob.sync(pattern, { cwd: dir.dist });
        if (files.length) {
          found.push(files);
        }
      }
      if (found.length) {
        throw new Error(
          `ThrowOnAssetsEmitedWebpackPlugin - Following assets are not permitted to be emited \n${found.join('\n')}`
        );
      }
    });
  }
}

class CreateFilePlugin {
  /** @type {string} */
  #filePath;
  /** @type {string} */
  #fileName;
  /** @type {string | Function<string>} */
  #content;

  /**
   * @param {string} filePath
   * @param {string} fileName
   * @param {string | Function<string>} content
   */
  constructor(filePath, fileName, content) {
    this.#filePath = filePath;
    this.#fileName = fileName;
    this.#content = content;
  }

  /** @param {Compiler} compiler */
  apply(compiler) {
    // the hook needs to execute after HtmlWebpackPlugin's hooks have fully completed
    compiler.hooks.done.tap('CreateFilePlugin', () => {
      this.#createFile();
    });
  }

  #createFile() {
    const fullPath = path.join(this.#filePath, this.#fileName);
    const directory = path.dirname(fullPath);
    const content = typeof this.#content === 'function' ? this.#content() : this.#content;
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    fs.writeFileSync(fullPath, content);
  }
}

/**
 * @param {...string} modules
 * @returns {string}
 */
function resolveNestedVersion(...modules) {
  let current = dir.node_modules;
  if (modules.length === 1) {
    current = path.resolve(current, modules[0], 'package.json');
  } else if (modules.length >= 1) {
    const resolver = enchancedResolve.create.sync({
      mainFiles: ['package'],
      extensions: ['.json'],
      enforceExtension: true
    });
    const [firstModule, ...otherModules] = modules;
    current = path.resolve(current, firstModule);
    for (const module of otherModules) {
      current = resolver(current, module);
    }
  }
  const packageJson = require(current);
  if (!packageJson) {
    throw new Error(`Module not found: ${modules.join(', ')}`);
  }
  return packageJson.version;
}

/**
 * @param {string} environment
 * @returns {{ browsers: string[], config: string | undefined }}
 */
function browserslistEnvironment(environment) {
  const browsers = browserslist(null, { env: environment });
  let config = browserslist.loadConfig({ path: dir.src, env: environment });
  config = Array.isArray(config) ? config.join(' or ') : config;
  return { browsers, config };
}

/** @param {RuleSetRule[]} rules */
function mergeBabelRules(rules) {
  for (let i = 0; i < rules.length; ++i) {
    for (let j = 0; j < rules.length; ++j) {
      // check for equal <test> and <use.loader> is for babel
      if (
        i != j &&
        rules[i].use?.loader?.includes('babel-loader') &&
        rules[j].use?.loader?.includes('babel-loader') &&
        String(rules[i].test) === String(rules[j].test)
      ) {
        rules[i] = structuredClone(rules[i]);

        /** @type {BabelTransformOptions} */
        const options = rules[i].use.options;
        // add <updateRule.use.options> to every babel.PluginOption in <existingRule.use.options.presets>
        for (const preset of options?.presets || []) {
          if (Array.isArray(preset) && preset.length >= 2) {
            preset[1] = Object.assign(preset[1], rules[j].use.options);
          }
        }

        rules.splice(j, 1);
        return;
      }
    }
  }
}

/**
 * @param {string} env
 * @returns {{[string]:string}}
 */
function resolveBabelTargets(env) {
  return babelPrettifyTargets(babelTargets({}, { browserslistEnv: env }));
}

/**
 * @param {...string} fileTypes
 * @returns {{[string]:string}}
 */
function fileSizes(...fileTypes) {
  const sizes = {};
  const files = glob.sync('**/*', { cwd: dir.dist });
  for (const file of files) {
    if (mathchesPatterns(path.basename(file), ...fileTypes)) {
      const stat = fs.statSync(path.resolve(dir.dist, file));
      const size = bytes.format(stat.size, { fixedDecimals: true, unitSeparator: ' ' });
      sizes[file] = size;
    }
  }
  return sizes;
}

/**
 * @param {string} filepath
 * @param {...string} patterns
 * @returns {boolean}
 */
function mathchesPatterns(filepath, ...patterns) {
  return [].concat(patterns || []).some((pattern) => minimatch(filepath, pattern));
}

/**
 * @param {WebpackPluginInstance[]} originalPlugins
 * @param {WebpackPluginInstance[]} newPlugins
 */
function mergeCspPlugin(originalPlugins, newPlugins) {
  const findCspPlugin = (plugin) => plugin.constructor.name === 'CspHtmlWebpackPlugin';
  const originalPlugin = originalPlugins.find(findCspPlugin);
  const newPlugin = newPlugins.find(findCspPlugin);
  if (originalPlugin && newPlugin) {
    const originalProcessFn = originalPlugin.opts.processFn;
    const newProcessFn = newPlugin.opts.processFn;
    const options = Object.assign({}, originalPlugin.opts);
    options.processFn = (...parameters) => {
      originalProcessFn(...parameters);
      newProcessFn(...parameters);
    };
    originalPlugin.opts = Object.freeze(options);
    newPlugins.splice(newPlugins.findIndex(findCspPlugin), 1);
  }
}

/** @type {PostcssPluginCreator} */
function postcssRemoveCarriageReturn() {
  /** @param {PostcssNode} node */
  const removeCarriageReturn = (node) => {
    const replace = (str) => str.replace(/\r/g, '');
    // prettier-ignore
    const props = node.type === 'atrule' ? ['params']
        : node.type === 'rule' ? ['selector']
        : node.type === 'decl' ? ['prop', 'value']
        : node.type === 'comment' ? ['text']
        : [];
    props.forEach((prop) => {
      node[prop] = replace(node[prop]);
    });
    Object.entries(node.raws).forEach(([key, value]) => {
      if (typeof value === 'string') {
        node.raws[key] = replace(value);
      }
    });
  };

  return {
    postcssPlugin: 'remove-carriage-return',
    /** @param {PostcssRoot} root */
    OnceExit(root) {
      removeCarriageReturn(root);
      root.walk(removeCarriageReturn);
    }
  };
}
postcssRemoveCarriageReturn.postcss = true;

module.exports = {
  dir,
  ScriptsHtmlWebpackPlugin,
  ThrowOnAssetsEmitedWebpackPlugin,
  CreateFilePlugin,
  resolveNestedVersion,
  resolveBabelTargets,
  fileSizes,
  mathchesPatterns,
  browserslistEnvironment,
  mergeBabelRules,
  mergeCspPlugin,
  postcssRemoveCarriageReturn
};
