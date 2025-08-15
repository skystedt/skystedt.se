import HtmlWebpackPlugin from 'html-webpack-plugin';
import { minimatch } from 'minimatch';
import fs from 'node:fs/promises';
import path from 'node:path';
import webpack from 'webpack';

/** @typedef { Parameters<Parameters<HtmlWebpackPlugin.Hooks["alterAssetTags"]["tap"]>[1]>[0]["assetTags"] } HtmlWebpackPlugin_AssetTags */
/** @typedef {{ files: { includeCompiledAssets: boolean, extraFileDirectories?: string[] }, tags: TagOption[] }} Options */
/** @typedef {{ path: string, tag: string, attributes?: TagAttributes }} TagOption */
/** @typedef {{ [attribute: string]: string | boolean | undefined }} TagAttributes */
/** @typedef {[AssetTagKey: keyof HtmlWebpackPlugin_AssetTags, tag: HtmlWebpackPlugin.HtmlTagObject, file: string]} CategorizedTag */

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
        const files = await this.#readFiles(compilation.options.output.path, compilation.assets);
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
   * @param {string | undefined} outputPath
   * @param {webpack.Compilation['assets']} assets
   * @returns {Promise<string[]>}
   */
  async #readFiles(outputPath, assets) {
    if (!outputPath) {
      throw new Error('Output path is not defined');
    }

    const files = /** @type {string[]} */ ([]);

    if (this.#options.files.includeCompiledAssets) {
      files.push(...Object.keys(assets));
    }

    await Promise.all(
      this.#options.files.extraFileDirectories?.map(async (dir) => {
        const entries = await fs.readdir(dir, { recursive: true });
        const relativeEntries = entries.map((entry) => path.join(path.relative(outputPath, dir), entry));
        files.push(...relativeEntries);
      }) || []
    );

    return files;
  }

  /**
   * @param {HtmlWebpackPlugin_AssetTags} assetTags
   * @param {CategorizedTag[]} categorizedTags
   * @param {string[]} files
   */
  async #addMissingTags(assetTags, categorizedTags, files) {
    for (const tagOption of this.#options.tags) {
      for (const file of files) {
        if (
          minimatch(file, tagOption.path) &&
          !categorizedTags.some(
            // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
            ([, , tagFile]) => tagFile === file
          )
        ) {
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
        if (minimatch(file, tagOption.path) && tag.tagName !== tagOption.tag) {
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
    return HtmlWebpackPlugin.createHtmlTagObject(
      tagName,
      {
        src: tagName === 'script' ? file : undefined,
        href: tagName === 'script' ? undefined : file
      },
      null,
      // @ts-ignore
      {
        plugin: TagsHtmlWebpackPlugin.name
      }
    );
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
