import HtmlWebpackPlugin from 'html-webpack-plugin';
import { minimatch } from 'minimatch';
import crypto from 'node:crypto';
import { parse } from 'parse5';
import webpack from 'webpack';

/** @typedef { import('parse5').DefaultTreeAdapterTypes.Node } Parse5Node */
/** @typedef { import('parse5').DefaultTreeAdapterTypes.Element } Parse5Element */
/** @typedef { import('parse5').DefaultTreeAdapterTypes.TextNode } Parse5TextNode */

/** @typedef { 'sha256' | 'sha384' | 'sha512' } HashAlgorithm */
/** @typedef { 'script' | 'style' } TargetType */
/** @typedef {{ [directive: string]: string | string[] }} Policy */
/**
 * @typedef {{
 *   hashAlgorithm: HashAlgorithm,
 *   metaTag?: boolean,
 *   ignore?: {
 *     inlineScripts?: boolean,
 *     inlineStyles?: boolean,
 *     externalPatterns?: string | string[]
 *   }
 *   callback?: (policy: Policy) => Policy | void
 * }} Options
 */
/**
 * @typedef {{
 *   type: TargetType,
 *   url: string | null,
 *   html: string | null,
 *   integrity?: string
 * }} ParsedTag
 */

const SCRIPT_SRC = 'script-src';
const STYLE_SRC = 'style-src';
const STRICT_DYNAMIC = "'strict-dynamic'";

// Plugin for adding a Content Security Policy (CSP) meta tag, without modifying the HTML
// Existing plugins like for this are destructive, they modify the HTML (e.g. by using Cheerio)
export default class CspHashesHtmlWebpackPlugin {
  /** @type {Policy} */
  #policy;
  /** @type {Options} */
  #options;

  /**
   * @param {Policy} policy
   * @param {Options} options
   */
  constructor(policy, options) {
    this.#policy = policy;
    this.#options = options;
  }

  /**
   * @param {Policy} policy
   * @returns {string}
   */
  static buildPolicy(policy) {
    return Object.entries(policy)
      .map(([directive, values]) => `${directive} ${/** @type {string[]} */ ([]).concat(values).join(' ')}`)
      .join('; ');
  }

  /**
   * @param {HashAlgorithm} hashAlgorithm
   * @param {string} data
   * @returns {string}
   */
  static #hash(hashAlgorithm, data) {
    const hash = crypto.createHash(hashAlgorithm).update(data, 'utf-8').digest('base64');
    return `'${hashAlgorithm}-${hash}'`;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap(CspHashesHtmlWebpackPlugin.name, (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapPromise(
        CspHashesHtmlWebpackPlugin.name,
        async (data) => {
          if (this.#options.metaTag !== false) {
            const metaTag = this.#createMetaTag();
            data.assetTags.meta.unshift(metaTag); // Insert first
          }
          return data;
        }
      );

      // Hook into after assets are injected into the html
      // Since we need to check both assets and html
      // We might as well check when the assets have been injected and only check the html
      // Which will also catch changes that plugins inject late in the process (for example 'html-inline-css-webpack-plugin')
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapPromise(CspHashesHtmlWebpackPlugin.name, async (data) => {
        const tagsFromHtml = this.#getTagsFromHtml(data.html);
        const tags = this.#filterTags(tagsFromHtml);
        this.#addLocalSources(compilation, tags);
        this.#calculateIntegrityHashes(tags);
        let policy = this.#addTagsToPolicy(tags);
        this.#reorderPolicy(policy);
        policy = this.#options.callback?.(policy) ?? policy;
        const builtPolicy = this.#buildMetaTagPolicy(policy);
        data.html = this.#setPolicyInMetaTag(data.html, builtPolicy);
        return data;
      });
    });
  }

  /** @returns {HtmlWebpackPlugin.HtmlTagObject} */
  #createMetaTag() {
    return {
      tagName: 'meta',
      voidTag: true,
      attributes: {
        'http-equiv': 'Content-Security-Policy',
        content: ''
      },
      meta: {
        plugin: CspHashesHtmlWebpackPlugin.name
      }
    };
  }

  /**
   * @param {string} html
   * @returns {ParsedTag[]}
   */
  #getTagsFromHtml(html) {
    /** @type {ParsedTag[]} */
    const tags = [];
    const document = parse(html);
    walk(document);
    return tags;

    /** @param {Parse5Node} node */
    function walk(node) {
      parseNode(node);
      /** @type {Parse5Element} */ (node).childNodes?.forEach(walk);
    }

    /** @param {Parse5Node} node */
    function parseNode(node) {
      if (node.nodeName === 'script') {
        // <script src="...">...</script>
        tags.push({
          type: 'script',
          url: node.attrs.find((attr) => attr.name === 'src')?.value || null,
          html: getInnerHtml(node)
        });
      }
      if (node.nodeName === 'style') {
        // <style>...</style>
        tags.push({
          type: 'style',
          url: null,
          html: getInnerHtml(node)
        });
      }
      if (node.nodeName === 'link' && node.attrs.some((attr) => attr.name === 'rel' && attr.value === 'stylesheet')) {
        // <link rel="stylesheet" href="...">
        tags.push({
          type: 'style',
          url: node.attrs.find((attr) => attr.name === 'href')?.value || null,
          html: null
        });
      }
      if (
        node.nodeName === 'link' &&
        node.attrs.some((attr) => attr.name === 'rel' && attr.value === 'preload') &&
        node.attrs.some((attr) => attr.name === 'as' && attr.value === 'script')
      ) {
        // <link rel="preload" as="script" href="...">
        // Eventhough CSP blocks execution and not loading, preload script are also blocked
        tags.push({
          type: 'script',
          url: node.attrs.find((attr) => attr.name === 'href')?.value || null,
          html: null
        });
      }
    }

    /**
     * @param {Parse5Node} node
     * @returns {string | null}
     */
    function getInnerHtml(node) {
      const childNode = /** @type {Parse5Element} */ (node).childNodes?.[0];
      if (childNode?.nodeName === '#text') {
        return /** @type {Parse5TextNode} */ (childNode).value;
      }
      return null;
    }
  }

  /**
   * @param {ParsedTag[]} tags
   * @returns {ParsedTag[]}
   */
  #filterTags(tags) {
    const externalPatterns = /** @type {string[]} */ ([]).concat(this.#options.ignore?.externalPatterns || []);
    const filteredTags = tags.filter((tag) => {
      if (tag.type === 'script' && tag.html && this.#options.ignore?.inlineScripts) {
        return false;
      }
      if (tag.type === 'style' && tag.html && this.#options.ignore?.inlineStyles) {
        return false;
      }
      if (tag.url) {
        return !externalPatterns.some((pattern) => minimatch(/** @type {string} */ (tag.url), pattern));
      }
      return true;
    });
    return filteredTags;
  }

  /**
   * @param {webpack.Compilation} compilation
   * @param {ParsedTag[]} tags
   */
  #addLocalSources(compilation, tags) {
    tags.forEach((tag) => {
      if (tag.url) {
        const asset = compilation.getAsset(tag.url);
        if (!asset) {
          throw Error(`Asset not found: ${tag.url}`);
        }

        tag.html = asset.source.source().toString();
      }
    });
  }

  /** @param {ParsedTag[]} tags */
  #calculateIntegrityHashes(tags) {
    tags
      .filter((tag) => tag.html)
      .forEach((tag) => {
        tag.integrity = CspHashesHtmlWebpackPlugin.#hash(this.#options.hashAlgorithm, /** @type {string} */ (tag.html));
      });
  }

  /**
   * @param {ParsedTag[]} tags
   * @returns {Policy}
   */
  #addTagsToPolicy(tags) {
    const policy = { ...this.#policy };
    tags.forEach((tag) => {
      if (tag.integrity) {
        if (tag.type === 'script') {
          policy[SCRIPT_SRC] = [...policy[SCRIPT_SRC], tag.integrity];
        }
        if (tag.type === 'style') {
          policy[STYLE_SRC] = [...policy[STYLE_SRC], tag.integrity];
        }
      }
    });
    return policy;
  }

  /** @param {Policy} policy */
  #reorderPolicy(policy) {
    if (policy[SCRIPT_SRC]?.includes(STRICT_DYNAMIC)) {
      // Move 'strict-dynamic' to the end of the script-src directive
      policy[SCRIPT_SRC] = /** @type {string[]} */ (policy[SCRIPT_SRC])
        .filter((value) => value !== STRICT_DYNAMIC)
        .concat(STRICT_DYNAMIC);
    }
  }

  /**
   * @param {Policy} policy
   * @returns {string}
   */
  #buildMetaTagPolicy(policy) {
    const {
      'report-uri': _, // Not allowed in <meta> tag
      ...metaTagPolicy
    } = policy;
    return CspHashesHtmlWebpackPlugin.buildPolicy(metaTagPolicy);
  }

  /**
   * @param {string} html
   * @param {string} builtPolicy
   * @returns {string}
   */
  #setPolicyInMetaTag(html, builtPolicy) {
    if (this.#options.metaTag === false) {
      return html;
    }
    const metaTagRegex = /(<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=)["']["']/i;
    return html.replace(metaTagRegex, `$1"${builtPolicy}"`);
  }
}
