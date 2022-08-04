/* eslint-env node */
const path = require('path');
const fs = require('fs');
const structuredClone = require('core-js/stable/structured-clone.js');
const enchancedResolve = require('enhanced-resolve');
const minimatch = require('minimatch');
const glob = require('glob');
const { default: babelTargets, prettifyTargets: babelPrettifyTargets } = require('@babel/helper-compilation-targets');
const HtmlWebpackPlugin = require('html-webpack-plugin');
/** @typedef { import("webpack").Compiler } Compiler */
/** @typedef { import("webpack").RuleSetRule } RuleSetRule */
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

// resolve babel -> browserslist -> caniuse-lite
// in case there are nested modules
const caniuseVersion = resolveNestedVersion('@babel/helper-compilation-targets', 'browserslist', 'caniuse-lite');

/**
 * @param {string} env
 * @returns {{[string]:string}}
 */
function resolveBabelTargets(env) {
  return babelPrettifyTargets(babelTargets({}, { browserslistEnv: env }));
}

const browsers = {
  version: caniuseVersion,
  all: resolveBabelTargets('all'),
  modern: resolveBabelTargets('modern'),
  legacy: resolveBabelTargets('legacy')
};

/**
 * @param {string} path1
 * @param {string} path2
 * @returns {string}
 */
function urlJoin(path1, path2) {
  if (!path2) {
    return path1;
  }
  if (!path1) {
    return path2;
  }
  return path1.replace(/\/+$/, '') + '/' + path2.replace(/^\/+/, '');
}

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
    compiler.hooks.compilation.tap('ScriptsAttributesHtmlWebpackPlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync(
        'ScriptsAttributesHtmlWebpackPlugin',
        async (data, cb) => {
          await this.#addScripts(data.publicPath, data.assetTags.scripts);
          this.#updateAttributes(data.assetTags.scripts);
          cb(null, data);
        }
      );
    });
  }

  /**
   * @param {string} publicPath
   * @param {HtmlTagObject[]} scripts
   */
  async #addScripts(publicPath, scripts) {
    for (const script of this.#add) {
      const files = glob.sync(script.path, { cwd: script.directory });
      for (const file of files) {
        const url = urlJoin(publicPath, file);
        const tag = HtmlWebpackPlugin.createHtmlTagObject('script', { src: url });
        scripts.push(tag);
      }
    }
  }

  /** @param {HtmlTagObject[]} scripts */
  #updateAttributes(scripts) {
    for (const script of scripts) {
      for (const attribute of this.#attributes) {
        if (minimatch(script.attributes.src, attribute.path)) {
          script.attributes.defer =
            attribute.defer === true || attribute.defer == false ? attribute.defer : script.attributes.defer;
          script.attributes.async =
            attribute.async === true || attribute.async == false ? attribute.async : script.attributes.async;
          switch (attribute.type) {
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
    const content = typeof this.#content === 'function' ? this.#content() : this.#content;
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
  browsers,
  ScriptsHtmlWebpackPlugin,
  ThrowOnAssetsEmitedWebpackPlugin,
  CreateFilePlugin,
  resolveNestedVersion,
  mergeBabelRules,
  postcssRemoveCarriageReturn
};
