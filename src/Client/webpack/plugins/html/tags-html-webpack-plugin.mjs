import HtmlWebpackPlugin from 'html-webpack-plugin';
import { minimatch } from 'minimatch';
import path from 'node:path';
import webpack from 'webpack';

/** @typedef {Parameters<Parameters<HtmlWebpackPlugin.Hooks["alterAssetTags"]["tap"]>[1]>[0]["assetTags"]} HtmlWebpackPlugin_AssetTags */
/**
 * @typedef {{
 *   files: {
 *   includeCompiledAssets: boolean,
 *   extraFileDirectories?: string[]
 * },
 *   tags: TagOption[]
 * }} Options
 */
/**
 * @typedef {{
 *   path: string,
 *   tag: string,
 *   attributes?: TagAttributes
 * }} TagOption
 */
/** @typedef {{ [attribute: string]: string | boolean | undefined }} TagAttributes */
/** @typedef {[AssetTagKey: keyof HtmlWebpackPlugin_AssetTags, tag: HtmlWebpackPlugin.HtmlTagObject, file: string]} CategorizedTag */
/** @typedef {{ name: string, isDirectory: () => boolean }} DirectoryEntry */

export default class TagsHtmlWebpackPlugin {
  #options;

  /** @param {Options} options */
  constructor(options) {
    this.#options = options;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap(TagsHtmlWebpackPlugin.name, (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapPromise(TagsHtmlWebpackPlugin.name, async (data) => {
        const categorizedTags = this.#categorizeAssetTags(data.assetTags);
        const files = await this.#readFiles(compilation);
        this.#addMissingTags(data.assetTags, categorizedTags, files);
        this.#updateTagTypes(data.assetTags, categorizedTags);
        this.#updateAttributes(categorizedTags);
        return data;
      });
    });
  }

  /**
   * @param {HtmlWebpackPlugin_AssetTags} assetTags
   * @returns {CategorizedTag[]}
   */
  #categorizeAssetTags(assetTags) {
    return /** @type {CategorizedTag[]} */ ([
      ...assetTags.scripts.map((tag) => ['scripts', tag, /** @type {string} */ (tag.attributes.src)]),
      ...assetTags.styles.map((tag) => ['styles', tag, /** @type {string} */ (tag.attributes.href)]),
      ...assetTags.meta.map((tag) => ['meta', tag, /** @type {string} */ (tag.attributes.href)])
    ]);
  }

  /**
   * @param {webpack.Compilation} compilation
   * @returns {Promise<string[]>}
   */
  async #readFiles(compilation) {
    const outputPath = compilation.options.output.path;
    if (!outputPath) {
      throw new Error('Output path is not defined');
    }

    // use the output file system, since the files might only exist in memory, e.g. when using webpack-dev-server
    const { outputFileSystem } = compilation.compiler;
    if (!outputFileSystem) {
      throw new Error('Output file system is not defined');
    }

    const files = /** @type {string[]} */ (
      this.#options.files.includeCompiledAssets ? Object.keys(compilation.assets) : []
    );

    await Promise.all(
      this.#options.files.extraFileDirectories?.map(async (dir) => {
        const entries = await this.#readDirectory(outputFileSystem, dir);
        const relativeEntries = entries.map((entry) => path.join(path.relative(outputPath, dir), entry));
        files.push(...relativeEntries);
      }) || []
    );

    // hot updates (webpack-dev-server) are loaded by the hot module replacement runtime, not by tags
    const filesWithoutHotUpdates = files.filter((file) => !minimatch(file, '**/*.hot-update.*'));
    return filesWithoutHotUpdates;
  }

  /**
   * @param {webpack.OutputFileSystem} fileSystem
   * @param {string} dir
   * @returns {Promise<string[]>} files in the directory and its subdirectories, relative to the directory
   */
  async #readDirectory(fileSystem, dir) {
    const readdir = fileSystem.readdir?.bind(fileSystem);
    if (!readdir) {
      throw new Error('Output file system does not support reading directories');
    }

    /** @type {DirectoryEntry[]} */
    const entries = await new Promise((resolve, reject) => {
      readdir(dir, { withFileTypes: true }, (error, result) => (error ? reject(error) : resolve(result ?? [])));
    });

    const files = await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isDirectory()) {
          return [entry.name];
        }
        const subEntries = await this.#readDirectory(fileSystem, path.join(dir, entry.name));
        return subEntries.map((subEntry) => path.join(entry.name, subEntry));
      })
    );

    return files.flat();
  }

  /**
   * @param {HtmlWebpackPlugin_AssetTags} assetTags
   * @param {CategorizedTag[]} categorizedTags
   * @param {string[]} files
   */
  async #addMissingTags(assetTags, categorizedTags, files) {
    for (const tagOption of this.#options.tags) {
      for (const file of files) {
        const tagIsMissing =
          // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
          minimatch(file, tagOption.path) && categorizedTags.every(([, , tagFile]) => tagFile !== file);
        if (tagIsMissing) {
          const tag = this.#createTag(file, tagOption.tag);
          this.#pushTag(assetTags, categorizedTags, tag);
        }
      }
    }
  }

  /**
   * @param {HtmlWebpackPlugin_AssetTags} assetTags
   * @param {CategorizedTag[]} categorizedTags
   */
  #updateTagTypes(assetTags, categorizedTags) {
    for (const [assetTagKey, tag, file] of categorizedTags) {
      for (const tagOption of this.#options.tags) {
        const tagNeedsUpdate = minimatch(file, tagOption.path) && tag.tagName !== tagOption.tag;
        if (tagNeedsUpdate) {
          assetTags[assetTagKey] = assetTags[assetTagKey].filter((assetTag) => assetTag !== tag);
          tag.tagName = tagOption.tag;
          this.#pushTag(assetTags, categorizedTags, tag);
        }
      }
    }
  }

  /** @param {CategorizedTag[]} categorizedTags */
  #updateAttributes(categorizedTags) {
    for (const [, tag, file] of categorizedTags) {
      for (const tagOption of this.#options.tags) {
        if (tagOption.attributes && minimatch(file, tagOption.path)) {
          for (const [key, value] of Object.entries(tagOption.attributes)) {
            tag.attributes[key] = value;
          }
        }
      }
    }
  }

  /**
   * @param {string} file
   * @param {string} tagName
   * @returns {HtmlWebpackPlugin.HtmlTagObject}
   */
  #createTag(file, tagName) {
    const tag = HtmlWebpackPlugin.createHtmlTagObject(tagName, tagName === 'script' ? { src: file } : { href: file });
    tag.meta = { plugin: TagsHtmlWebpackPlugin.name };
    return tag;
  }

  /**
   * @param {HtmlWebpackPlugin_AssetTags} assetTags
   * @param {CategorizedTag[]} categorizedTags
   * @param {HtmlWebpackPlugin.HtmlTagObject} tag
   */
  #pushTag(assetTags, categorizedTags, tag) {
    let /** @type {keyof HtmlWebpackPlugin_AssetTags} */ assetTagKey;
    if (tag.tagName === 'script') {
      assetTagKey = 'scripts';
    } else if (tag.tagName === 'style') {
      assetTagKey = 'styles';
    } else {
      assetTagKey = 'meta';
    }
    assetTags[assetTagKey].push(tag);
    categorizedTags.push([assetTagKey, tag, /** @type {string} */ (tag.attributes.src || tag.attributes.href)]);
  }
}
