import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import prettierConfig from './prettier.config.mjs';

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));
const projectRoot = path.resolve(__dirname, '..');
const projectTsConfig = path.resolve(projectRoot, 'tsconfig.json');

const tsConfigs = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  languageOptions: {
    ...config.languageOptions,
    parserOptions: {
      ...(config.languageOptions?.parserOptions ?? {}),
      project: projectTsConfig,
      tsconfigRootDir: projectRoot,
    },
  },
}));

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules'],
  },
  js.configs.recommended,
  ...tsConfigs,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions,
      },
    },
    plugins: {
      import: eslintPluginImport,
      prettier: eslintPluginPrettier,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: projectTsConfig,
        },
      },
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: [['builtin', 'external'], ['internal'], ['parent', 'sibling', 'index']],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          'newlines-between': 'always',
        },
      ],
      'import/newline-after-import': ['error', { count: 1 }],
      'prettier/prettier': ['error', prettierConfig],
    },
  },
  eslintConfigPrettier
);

