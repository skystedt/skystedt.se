// @ts-expect-error TS2307, TODO
import babelParser from '@babel/eslint-parser/experimental-worker'; // experimental-worker is needed to run asynchronously, which is needed when using esm configuration
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import airbnb from 'eslint-config-airbnb-base';
import prettier from 'eslint-config-prettier';
import compat from 'eslint-plugin-compat';
import jsdoc from 'eslint-plugin-jsdoc';
import pluginPromise from 'eslint-plugin-promise';
import globals from 'globals';

/** @typedef { import("eslint").Linter.FlatConfig } FlatConfig */
/** @typedef { import("eslint").Linter.RulesRecord } Rules */

/** @returns {Promise<{airbnb: Rules, import: Rules}>} */
const loadAirbnbRules = async () => {
  const rules = {
    airbnb: /** @type {Rules} */ ({}),
    import: /** @type {Rules} */ ({})
  };

  for (const rulesFile of airbnb.extends) {
    // Resolve the rules file and import it
    var filePath = import.meta.resolve(rulesFile, 'eslint-config-airbnb-base');
    const file = await import(`file://${filePath}`);

    // Split rules into airbnb and import
    for (const [key, value] of Object.entries(/** @type {Rules} */ (file.default.rules))) {
      const type = key.startsWith('import/') ? 'import' : 'airbnb';
      rules[type][key] = value;
    }
  }

  return rules;
};

let { airbnb: airbnbRules, import: importRules } = await loadAirbnbRules();
// Rename import rules to import-x
importRules = Object.fromEntries(
  Object.entries(importRules).map(([key, value]) => [key.replace('import/', 'import-x/'), value])
);

/** @type {FlatConfig[]} */
export default [
  {
    files: ['**/*.mjs'],
    ignores: ['node_modules/**'],
    languageOptions: {
      // TODO: ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser
        // TODO: ...globals.es2015 // is this needed, and if so what version?
      },
      parser: babelParser,
      parserOptions: {
        babelOptions: {
          plugins: ['@babel/plugin-syntax-import-attributes'] // required for "import with json" in the configuration file
        }
      }
    }
  },
  /** @type {FlatConfig} */ (comments.recommended),
  {
    ...jsdoc.configs['flat/recommended'],
    rules: {
      'jsdoc/valid-types': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/check-indentation': 'warn',
      'jsdoc/check-syntax': 'warn',
      'jsdoc/no-blank-blocks': 'warn',
      'jsdoc/no-blank-block-descriptions': 'warn',
      'jsdoc/sort-tags': 'warn'
    }
  },
  { ...pluginPromise.configs['flat/recommended'] },
  {
    ...compat.configs['flat/recommended'],
    settings: {
      polyfills: ['Promise', 'fetch', 'navigator.sendBeacon', 'Array.from'],
      browserslistOpts: { env: 'all-exclude-opera-mini' }
    }
  },
  {
    rules: {
      ...airbnbRules,
      curly: ['error', 'all'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      'no-shadow': ['error', { ignoreOnInitialization: true }],
      'no-use-before-define': ['error', { functions: false, classes: false, variables: true }],
      'class-methods-use-this': 'off',
      'max-classes-per-file': 'off',
      'no-param-reassign': ['error', { props: false }]
    }
  },
  {
    rules: {
      ...importRules,
      'import-x/extensions': ['error', 'ignorePackages'],
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: ['!src/**'] }]
    },
    settings: {
      'import/resolver': {
        'eslint-import-resolver-exports': {},
        'eslint-import-resolver-custom-alias': {
          alias: {
            $renderer: './src/game/renderer/pixi/pixi.mjs'
          }
        }
      }
    }
  },
  prettier // disables unnecessary/conflicting rules when using prettier, should be last, https://github.com/prettier/eslint-config-prettier#installation
];
