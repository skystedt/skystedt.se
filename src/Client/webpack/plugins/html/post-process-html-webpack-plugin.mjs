import { diffLines } from 'diff';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { defaultTreeAdapter, parseFragment, serialize } from 'parse5';
import webpack from 'webpack';

/** @typedef { import('parse5').DefaultTreeAdapterTypes.ChildNode } Parse5ChildNode */
/** @typedef { import('parse5').DefaultTreeAdapterTypes.TextNode } Parse5TextNode */
/** @typedef { import('parse5').DefaultTreeAdapterTypes.CommentNode } Parse5CommentNode */

const whitespacesRegExp = /^\s*$/;
const headTagRegExp = /^(?<start>(?<indent>\s*)<head\s*>)?\s*(?<end><\/head\s*>[\s\S]*$)/im;
const bodyTagRegExp = /^(?<start>(?<indent>\s*)<body\s*>)?\s*(?<end><\/body\s*>[\s\S]*$)/im;

export default class PostProcessHtmlWebpackPlugin {
  /**
   * @typedef {{
   *   insertNewLines?: boolean,
   *   headIndentation?: string,
   *   bodyIndentation?: string
   * }} Options
   */

  /** @type {string} */
  #preHtml = '';
  /** @type {Options} */
  #options;

  /** @param {Options} options */
  constructor(options) {
    this.#options = options;
  }

  /** @param {webpack.Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap(PostProcessHtmlWebpackPlugin.name, (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).afterTemplateExecution.tapPromise(
        PostProcessHtmlWebpackPlugin.name,
        async (data) => {
          this.#preHtml = data.html; // html before assets are injected
          return data;
        }
      );
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapPromise(PostProcessHtmlWebpackPlugin.name, async (data) => {
        const postHtml = data.html; // html after assets are injected

        const headDiff = this.#diffHtml(this.#preHtml, postHtml, headTagRegExp);
        if (headDiff) {
          const headAdditions = this.#alterHtml(
            headDiff.html,
            this.#options.headIndentation,
            this.#options.insertNewLines ?? false,
            headDiff.singleLine
          );
          this.#preHtml = this.#preHtml.slice(0, headDiff.index) + headAdditions + this.#preHtml.slice(headDiff.index);
          data.html = this.#preHtml;
        }

        const bodyDiff = this.#diffHtml(this.#preHtml, postHtml, bodyTagRegExp);
        if (bodyDiff) {
          const bodyAdditions = this.#alterHtml(
            bodyDiff.html,
            this.#options.bodyIndentation,
            this.#options.insertNewLines ?? false,
            bodyDiff.singleLine
          );
          this.#preHtml = this.#preHtml.slice(0, bodyDiff.index) + bodyAdditions + this.#preHtml.slice(bodyDiff.index);
          data.html = this.#preHtml;
        }

        return data;
      });
    });
  }

  /**
   * @param {string} html1
   * @param {string} html2
   * @param {RegExp} tagRegExp
   * @returns {{ index: number, html: string, singleLine: string? }?}
   */
  #diffHtml(html1, html2, tagRegExp) {
    const changes = diffLines(html1, html2);
    let count = 0;
    for (let index = 0; index < changes.length - 1; index += 1) {
      const change = changes[index];
      if (!change.added && !change.removed) {
        count += change.value.length;
      }
      if (change.removed) {
        const match = change.value.match(tagRegExp);
        if (match?.groups) {
          count += match.groups.start?.length ?? 0;
          const endTag = match.groups.end;
          const nextChange = changes[index + 1];
          if (nextChange.added && nextChange.value.endsWith(endTag)) {
            const html = nextChange.value.slice(0, -endTag.length);
            const singleLine = match.groups.start ? match.groups.indent : null;
            return { index: count, html, singleLine };
          }
          break;
        }
      }
    }
    return null;
  }

  /**
   * @param {string} html
   * @param {string | undefined} indentation
   * @param {boolean} insertNewLines
   * @param {string?} previouslySingleLine
   * @returns {string}
   */
  #alterHtml(html, indentation, insertNewLines, previouslySingleLine) {
    const fragment = parseFragment(html);

    const newLine = insertNewLines ? '\n' : '';

    fragment.childNodes = fragment.childNodes
      // remove indentation
      .filter(
        (node) => !(node.nodeName === '#text' && /** @type {Parse5TextNode} */ (node).value.match(whitespacesRegExp))
      )
      // add indentation and newlines
      .flatMap((node) => [
        defaultTreeAdapter.createTextNode(indentation ?? ''),
        node,
        defaultTreeAdapter.createTextNode(newLine)
      ]);

    if (previouslySingleLine && insertNewLines) {
      // the start and end tags was previously on a single line
      // so we need to add new line first (will appear directly after start tag)
      // and indentation at the end (will appear before directly before end tag)
      fragment.childNodes.unshift(defaultTreeAdapter.createTextNode(newLine));
      fragment.childNodes.push(defaultTreeAdapter.createTextNode(previouslySingleLine));
    }

    const newHtml = serialize(fragment);
    return newHtml;
  }
}
