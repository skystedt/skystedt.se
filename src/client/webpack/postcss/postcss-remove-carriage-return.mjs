import postcss from 'postcss';

/** @type {postcss.PluginCreator} */
const postcssRemoveCarriageReturn = () => {
  /** @param {postcss.Node} node */
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
    /** @param {postcss.Root} root */
    OnceExit(root) {
      removeCarriageReturn(root);
      root.walk(removeCarriageReturn);
    }
  };
};
postcssRemoveCarriageReturn.postcss = true;

export default postcssRemoveCarriageReturn;
