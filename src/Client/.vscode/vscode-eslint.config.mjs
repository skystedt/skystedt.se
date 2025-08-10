import config from '../eslint.config.mjs';

export default config.map((item) => {
  if (item.name === 'settings/global') {
    item.linterOptions = {
      ...item.linterOptions,
      // disable unused eslint disable directives, since vscode will automaticly remove them them when there are other errors
      // https://github.com/microsoft/vscode-eslint/issues/1938
      reportUnusedDisableDirectives: false
    };
  }

  return item;
});
