// @ts-expect-error TS2307
import babelParser from '@babel/eslint-parser/experimental-worker'; // experimental-worker is needed to run asynchronously, which is needed when using esm configuration
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import airbnb from 'eslint-config-airbnb-base';
import prettier from 'eslint-config-prettier';
import compat from 'eslint-plugin-compat';
import importX from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import pluginPromise from 'eslint-plugin-promise';
import globals from 'globals';

/** @typedef { import("eslint").Linter.FlatConfig } FlatConfig */
/** @typedef { import("eslint").Linter.RulesRecord } Rules */

/** @typedef { typeof pluginPromise & { configs: { [config: string]: FlatConfig } } } PromiseConfig */

/** @returns {Promise<Rules>} */
const loadAirbnbRules = async () => {
  const promises = /** @type {Promise<Rules>[]} */ ([]);

  airbnb.extends.forEach((rulesFile) => {
    // Resolve the rules file and import it
    const filePath = import.meta.resolve(rulesFile, 'eslint-config-airbnb-base');
    const pathPrefix = process.platform === 'win32' ? 'file://' : '';
    const fileImport = import(`${pathPrefix}${filePath}`);
    const promise = fileImport.then((file) => file.default.rules);
    promises.push(promise);
  });

  const rulesArray = await Promise.all(promises);
  const rules = /** @type {Rules} */ (Object.assign({}, ...rulesArray));
  return rules;
};

/**
 * @param {Rules} rules
 * @returns {{airbnbRules: Rules, importRules: Rules}}
 */
const splitAirbnbRules = (rules) => {
  const airbnbRules = /** @type {Rules} */ ({});
  const importRules = /** @type {Rules} */ ({});

  Object.entries(rules).forEach(([key, value]) => {
    if (key.startsWith('import/')) {
      // Rename import rules to import-x
      importRules[key.replace('import/', 'import-x/')] = value;
    } else {
      airbnbRules[key] = value;
    }
  });

  return { airbnbRules, importRules };
};

const allAirBnbRules = await loadAirbnbRules();
const { airbnbRules, importRules } = splitAirbnbRules(allAirBnbRules);

/** @type {FlatConfig[]} */
export default [
  {
    name: 'settings/global',
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2017,
      sourceType: 'module',
      parser: babelParser
    }
  },
  {
    name: 'settings/build',
    files: ['*.mjs', 'webpack/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node
      },
      parserOptions: {
        babelOptions: {
          plugins: ['@babel/plugin-syntax-import-attributes'] // required for "import with json" in the configuration file
        }
      }
    }
  },
  {
    name: 'settings/global-ignores',
    ignores: ['.yarn/']
  },
  {
    name: 'settings/src',
    files: ['src/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    .../** @type {FlatConfig} */ (comments.recommended),
    name: 'plugin/comments/recommended'
  },
  {
    ...jsdoc.configs['flat/recommended'],
    name: 'plugin/jsdoc/recommended',
    rules: {
      ...jsdoc.configs['flat/recommended'].rules,
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
  {
    .../** @type {PromiseConfig} */ (pluginPromise).configs['flat/recommended'],
    name: 'plugin/promise/recommended'
  },
  {
    ...compat.configs['flat/recommended'],
    name: 'plugin/compat/recommended',
    files: ['src/**/*.mjs'],
    settings: {
      polyfills: ['Promise', 'fetch', 'navigator.sendBeacon', 'Array.from'],
      browserslistOpts: { env: 'eslint-plugin-compat' }
    }
  },
  {
    .../** @type {FlatConfig} */ (importX.flatConfigs.recommended),
    name: 'plugin/import-x/recommended',
    settings: {
      'import-x/resolver': {
        'eslint-import-resolver-exports': {},
        'eslint-import-resolver-custom-alias': {
          alias: {
            $renderer: './src/game/renderer/pixi/pixi.mjs'
          }
        }
      }
    }
  },
  {
    name: 'rules/airbnb',
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
    name: 'rules/import-x/airbnb',
    rules: {
      ...importRules,
      'import-x/extensions': ['error', 'ignorePackages'],
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: ['!src/**'] }]
    }
  },
  {
    ...prettier, // disables unnecessary/conflicting rules when using prettier, should be last, https://github.com/prettier/eslint-config-prettier#installation
    name: 'rules/prettier/overrides'
  }
];
