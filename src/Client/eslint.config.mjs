// cSpell:ignore nonconstructor
import babelParser from '@babel/eslint-parser';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import stylistic from '@stylistic/eslint-plugin';
import airbnb from 'eslint-config-airbnb-base';
import prettier from 'eslint-config-prettier/flat';
import compat from 'eslint-plugin-compat';
import { flatConfigs as importX } from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import nodePlugin from 'eslint-plugin-n';
import pluginPromise from 'eslint-plugin-promise';
import globals from 'globals';
import { Renderer, rendererPath } from './webpack/dir.mjs';

/** @typedef { import("eslint").Linter.Config } Config */
/** @typedef { import("eslint").Linter.RulesRecord } Rules */

/** @typedef { keyof import("@stylistic/eslint-plugin").UnprefixedRuleOptions } StylisticRuleKey */

/** @typedef { typeof pluginPromise & { configs: { [config: string]: Config } } } PromiseConfig */

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
 * @returns {{base: Rules, stylistic: Rules, import: Rules, node: Rules}}
 */
const splitAirbnbRules = (rules) => {
  const baseRules = /** @type {Rules} */ ({});
  const stylisticRules = /** @type {Rules} */ ({});
  const importRules = /** @type {Rules} */ ({});
  const nodeRules = /** @type {Rules} */ ({});

  /** @type {{ [key: string]: [Rules, string] }} */
  const deprecatedMap = {
    'lines-around-directive': [stylisticRules, '@stylistic/padding-line-between-statements'],
    'no-spaced-func': [stylisticRules, '@stylistic/function-call-spacing'],
    'no-return-await': [{}, ''],
    'no-new-object': [baseRules, 'no-object-constructor'],
    'no-new-symbol': [baseRules, 'no-new-native-nonconstructor'],
    'global-require': [nodeRules, 'n/global-require'],
    'no-buffer-constructor': [nodeRules, 'n/no-deprecated-api'],
    'no-new-require': [nodeRules, 'n/no-new-require'],
    'no-path-concat': [nodeRules, 'n/no-path-concat']
  };

  Object.entries(rules).forEach(([key, value]) => {
    let newRules = baseRules;
    let newKey = key;
    if (stylistic.rules[/** @type {StylisticRuleKey} */ (key)]) {
      newRules = stylisticRules;
      newKey = `@stylistic/${key}`;
    } else if (key.startsWith('import/')) {
      newRules = importRules;
      newKey = `import-x/${key.slice(7)}`; // Rename import rules to import-x
    } else if (deprecatedMap[key]) {
      [newRules, newKey] = deprecatedMap[key];
    }
    newRules[newKey] = value;
  });

  return {
    base: baseRules,
    stylistic: stylisticRules,
    import: importRules,
    node: nodeRules
  };
};

const airbnbUnsplitRules = await loadAirbnbRules();
const airbnbRules = splitAirbnbRules(airbnbUnsplitRules);

/** @type {Config[]} */
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
    .../** @type {Config} */ (comments.recommended),
    name: 'plugin/comments/recommended'
  },
  {
    ...jsdoc.configs['flat/recommended'],
    name: 'plugin/jsdoc/recommended',
    rules: { ...jsdoc.configs['flat/recommended'].rules }
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
      polyfills: ['Promise', 'fetch', 'navigator.sendBeacon', 'Array.from', 'Map'],
      browserslistOpts: { env: 'eslint-plugin-compat' }
    }
  },
  {
    plugins: { n: nodePlugin },
    name: 'plugin/node'
    // only added to map deprecated airbnb rules to n plugin rules
  },
  {
    .../** @type {Config} */ (importX.recommended),
    name: 'plugin/import-x/recommended',
    settings: {
      'import-x/resolver': {
        'eslint-import-resolver-exports': {},
        'eslint-import-resolver-custom-alias': {
          alias: {
            $renderer: rendererPath(Renderer.HTML)
          }
        }
      }
    }
  },
  {
    ...stylistic.configs.recommended,
    name: 'plugin/@stylistic/recommended'
  },
  {
    name: 'rules/airbnb/base',
    rules: { ...airbnbRules.base }
  },
  {
    name: 'rules/airbnb/node',
    rules: { ...airbnbRules.node }
  },
  {
    name: 'rules/airbnb/import-x',
    rules: { ...airbnbRules.import }
  },
  {
    name: 'rules/airbnb/@stylistic',
    rules: { ...airbnbRules.stylistic }
  },
  {
    name: 'overrides/jsdoc',
    rules: {
      'jsdoc/valid-types': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/check-indentation': ['warn', { excludeTags: ['typedef'] }],
      'jsdoc/check-syntax': 'warn',
      'jsdoc/no-blank-blocks': 'warn',
      'jsdoc/no-blank-block-descriptions': 'warn',
      'jsdoc/sort-tags': 'warn'
    }
  },
  {
    name: 'overrides/airbnb',
    rules: {
      curly: ['error', 'all'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-shadow': ['error', { ignoreOnInitialization: true }],
      'no-use-before-define': ['error', { functions: false, classes: false, variables: true }],
      'class-methods-use-this': 'off',
      'max-classes-per-file': 'off',
      'no-param-reassign': ['error', { props: false }]
    }
  },
  {
    name: 'overrides/import-x',
    rules: {
      'import-x/extensions': ['error', 'ignorePackages'],
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: ['!src/**'] }]
    }
  },
  {
    name: 'overrides/@stylistic',
    rules: {
      '@stylistic/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }]
    }
  },
  {
    ...prettier, // disables unnecessary/conflicting rules when using prettier, should be last, https://github.com/prettier/eslint-config-prettier#installation
    name: 'overrides/prettier'
  }
];
