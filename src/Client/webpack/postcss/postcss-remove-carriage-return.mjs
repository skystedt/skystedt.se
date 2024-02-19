import postcss from 'postcss';

/** @type {postcss.PluginCreator<void>} */
const postcssRemoveCarriageReturn = () => {
  /** @param {postcss.AnyNode} node */
  const removeCarriageReturn = (node) => {
    const replace = (/** @type {string} */ str) => str.replace(/\r/g, '');

    /* eslint-disable no-param-reassign */
    switch (node.type) {
      case 'atrule':
        node.name = replace(node.name);
        break;
      case 'rule':
        node.selector = replace(node.selector);
        break;
      case 'decl':
        node.prop = replace(node.prop);
        node.value = replace(node.value);
        break;
      case 'comment':
        node.text = replace(node.text);
        break;
      default:
      // do nothing
    }

    Object.entries(node.raws).forEach(([key, value]) => {
      if (typeof value === 'string') {
        node.raws[key] = replace(value);
      }
    });
    /* eslint-enable no-param-reassign */
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
