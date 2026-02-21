// cSpell:ignore nonconstructor
import babelParser from '@babel/eslint-parser';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import stylistic from '@stylistic/eslint-plugin';
import airbnb from 'eslint-config-airbnb-base';
import prettier from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import compat from 'eslint-plugin-compat';
import { flatConfigs as importX } from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import nodePlugin from 'eslint-plugin-n';
import promisePlugin from 'eslint-plugin-promise';
import security from 'eslint-plugin-security';
import { configs as sonarjs } from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

/** @typedef { import("eslint").Linter.Config } Config */
/** @typedef { import("eslint").Linter.RulesRecord } Rules */
/** @typedef { import("eslint").Linter.RuleEntry } RuleEntry */

/** @typedef { keyof import("@stylistic/eslint-plugin").UnprefixedRuleOptions } StylisticRuleKey */

/** @typedef { typeof promisePlugin & { configs: { [config: string]: Config } } } PromiseConfig */

/** @returns {Promise<Rules>} */
const loadAirbnbRules = async () => {
  const promises = /** @type {Promise<Rules>[]} */ ([]);

  for (const rulesFile of airbnb.extends) {
    // Resolve the rules file and import it
    const filePath = import.meta.resolve(rulesFile, 'eslint-config-airbnb-base');
    const pathPrefix = process.platform === 'win32' ? 'file://' : '';
    const fileImport = import(`${pathPrefix}${filePath}`);
    const promise = fileImport.then((file) => file.default.rules);
    promises.push(promise);
  }

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

  for (const [key, value] of Object.entries(rules)) {
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
  }

  return {
    base: baseRules,
    stylistic: stylisticRules,
    import: importRules,
    node: nodeRules
  };
};

/**
 * @template T
 * @param {RuleEntry} entry
 * @param {(value: T) => boolean} filterPredicate
 * @returns {RuleEntry}
 */
const modifyRuleOptions = (entry, filterPredicate) => {
  if (!Array.isArray(entry)) {
    return entry;
  }
  return [entry[0], ...entry.slice(1).filter(filterPredicate)];
};

const airbnbUnsplitRules = await loadAirbnbRules();
const airbnbRules = splitAirbnbRules(airbnbUnsplitRules);

const buildFiles = ['*.mjs', 'webpack/**/*.mjs'];

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
    files: buildFiles,
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
    .../** @type {PromiseConfig} */ (promisePlugin).configs['flat/recommended'],
    name: 'plugin/promise/recommended'
  },
  {
    ...compat.configs['flat/recommended'],
    name: 'plugin/compat/recommended',
    files: ['src/**/*.mjs'],
    settings: {
      polyfills: [
        'Promise', // core-js
        'fetch', // unfetch
        'navigator.sendBeacon', // navigator.sendbeacon
        'Array.from', // core-js
        'Map', // core-js
        'Number.parseInt' // core-js
      ],
      browserslistOpts: { env: 'eslint-plugin-compat' }
    }
  },
  {
    plugins: { n: nodePlugin },
    name: 'plugin/node'
    // only added to map deprecated airbnb rules to n plugin rules
  },
  {
    ...importX.recommended,
    name: 'plugin/import-x/recommended',
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()]
    }
  },
  {
    .../** @type {Config} */ (security.configs.recommended),
    name: 'plugin/security/recommended'
  },
  {
    ...unicorn.configs.recommended,
    name: 'plugin/unicorn/recommended'
  },
  {
    ...sonarjs.recommended,
    name: 'plugin/sonarjs/recommended'
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
      'no-restricted-syntax': modifyRuleOptions(
        airbnbRules.base['no-restricted-syntax'],
        (option) => option.selector !== 'ForOfStatement'
      ),
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
    name: 'overrides/security/build',
    files: buildFiles,
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off'
    }
  },
  {
    name: 'overrides/unicorn',
    rules: {
      'unicorn/no-null': 'off', // Opinionated
      'unicorn/consistent-function-scoping': 'off', // Opinionated
      'unicorn/no-array-callback-reference': 'off', // Opinionated
      'unicorn/no-zero-fractions': 'off', // Opinionated
      'unicorn/prefer-set-has': 'off', // Needs polyfills in some older browsers
      'unicorn/prefer-top-level-await': 'off', // Makes babel give warnings
      'unicorn/prefer-global-this': 'off' // Breaks SplitChunksPlugin with cache group conflict for 'polyfills'
    }
  },
  {
    name: 'overrides/unicorn/build',
    files: buildFiles,
    rules: {
      'unicorn/prevent-abbreviations': /* Opinionated */ [
        'error',
        {
          allowList: {
            args: true,
            dir: true,
            src: true
          }
        }
      ]
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
