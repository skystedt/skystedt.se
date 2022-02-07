/* eslint-disable no-undef */
const path = require('path');
const resolve = require('enhanced-resolve');
const minimatch = require('minimatch');
const glob = require('glob');
const { default: babelTargets } = require('@babel/helper-compilation-targets');
const HtmlWebpackPlugin = require('html-webpack-plugin');
/** @typedef { import("webpack").Compiler } Compiler */
/** @typedef { import("webpack").RuleSetRule } RuleSetRule */
/** @typedef { import("@babel/core").TransformOptions } BabelTransformOptions */
/** @typedef { import("html-webpack-plugin").HtmlTagObject } HtmlTagObject */
/** @typedef { import("html-webpack-plugin").ProcessedOptions } ProcessedOptions */
/** @typedef { import("csp-html-webpack-plugin").Policy } CspPolicy */

const dir = {
  src: path.resolve(__dirname, 'src'),
  dist: path.resolve(__dirname, 'dist'),
  node_modules: path.resolve(__dirname, 'node_modules')
};

const browsers = {
  version: caniuseVersion(),
  modern: babelTargets({}, { browserslistEnv: 'modern' }),
  legacy: babelTargets({}, { browserslistEnv: 'legacy' })
};

/** @returns {string} */
function caniuseVersion() {
  // resolve babel -> browserslist -> caniuse-lite
  // in case there are nested modules
  const resolver = resolve.create.sync({ mainFiles: ['package'], extensions: ['.json'], enforceExtension: true });
  const browserslist = resolver(path.resolve(dir.node_modules, '@babel/helper-compilation-targets'), 'browserslist');
  const caniuse = resolver(browserslist, 'caniuse-lite');
  const packageJson = require(caniuse);
  return packageJson.version;
}

class ScriptsHtmlWebpackPlugin {
  /** @typedef {{ path: string, directory: string }} AddScript */
  /** @typedef {{ path: string, defer?: boolean, async?: boolean, type?: "module" | "nomodule" | false }} ScriptAttributes */

  /** @type {string[]} */
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
        (data, cb) => {
          this.#addScripts(data.assetTags.scripts);
          this.#updateAttributes(data.assetTags.scripts);
          cb(null, data);
        }
      );
    });
  }

  /** @param {HtmlTagObject[]} scripts */
  #addScripts(scripts) {
    for (const script of this.#add) {
      const files = glob.sync(script.path, { cwd: script.directory });
      for (const file of files) {
        const tag = HtmlWebpackPlugin.createHtmlTagObject('script', { src: file });
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

/**
 * @param {RuleSetRule[]} existingRules
 * @param {RuleSetRule[]} updateRules
 */
function mergeBabelRules(existingRules, updateRules) {
  for (const existing of existingRules) {
    for (const update of updateRules) {
      // check for equal <test> and <use.loader> is for babel
      if (
        String(existing.test) === String(update.test) &&
        existing.use?.loader?.includes('babel') &&
        update.use?.loader?.includes('babel')
      ) {
        /** @type {BabelTransformOptions} */
        const options = existing.use.options;
        // add <updateRule.use.options> to every babel.PluginOption in <existingRule.use.options.presets>
        for (const preset of options?.presets || []) {
          if (Array.isArray(preset) && preset.length >= 2) {
            preset[1] = Object.assign(preset[1], update.use.options);
          }
        }
      }
    }
  }
}

/**
 * @param {RuleSetRule[]} existingRules
 * @param {RuleSetRule[]} updateRules
 */
function mergeCssRules(existingRules, updateRules) {
  for (const existing of existingRules) {
    for (const update of updateRules) {
      // check for equal <use.test> is for css
      if (existing.test?.toString()?.includes('\\.css') && update.test?.toString()?.includes('\\.css')) {
        // replace <existingRule.use> with <updateRule.use>
        existing.use = update.use;
      }
    }
  }
}

/**
 * @param {string[]} patterns
 * @returns {(string) => boolean}
 */
function wildcardMatch(...patterns) {
  return (value) => patterns.some((pattern) => minimatch(value, pattern));
}

/** @returns {CspPolicy} */
function contentSecurityPolicy() {
  const staticWebAppConfig = require('./staticwebapp.config.json');
  const cspHeader = staticWebAppConfig.routes.find((value) => value.route === '/').headers['Content-Security-Policy'];
  const csp = cspHeader
    .split(';')
    .map((value) => value.trim().split(' '))
    .reduce((map, value) => {
      map[value[0]] = value.slice(1);
      return map;
    }, {});
  return csp;
}

module.exports = {
  dir,
  browsers,
  ScriptsHtmlWebpackPlugin,
  ThrowOnAssetsEmitedWebpackPlugin,
  mergeBabelRules,
  mergeCssRules,
  wildcardMatch,
  contentSecurityPolicy
};
