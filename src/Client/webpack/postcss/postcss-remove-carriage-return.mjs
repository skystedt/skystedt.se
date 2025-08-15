// cSpell:ignore atrule
import postcss from 'postcss';

/** @type {postcss.PluginCreator<void>} */
const postcssRemoveCarriageReturn = () => {
  /** @param {postcss.AnyNode} node */
  const removeCarriageReturn = (node) => {
    const replace = (/** @type {string} */ string) => string.replaceAll('\r', '');

    switch (node.type) {
      case 'atrule': {
        node.name = replace(node.name);
        break;
      }
      case 'rule': {
        node.selector = replace(node.selector);
        break;
      }
      case 'decl': {
        node.prop = replace(node.prop);
        node.value = replace(node.value);
        break;
      }
      case 'comment': {
        node.text = replace(node.text);
        break;
      }
      default: {
        // do nothing
        break;
      }
    }

    for (const [key, value] of Object.entries(node.raws)) {
      if (typeof value === 'string') {
        node.raws[key] = replace(value);
      }
    }
  };

  return {
    postcssPlugin: 'remove-carriage-return',
    /** @param {postcss.Root} root */
    OnceExit(root) {
      removeCarriageReturn(root);
      root.walk(removeCarriageReturn);
    }
  };
};
postcssRemoveCarriageReturn.postcss = true;

export default postcssRemoveCarriageReturn;
