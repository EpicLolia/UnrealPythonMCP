// @ts-check

// https://eslint.org/docs/latest/use/configure/configuration-files
// https://prettier.io/docs/integrating-with-linters
// https://typescript-eslint.io/getting-started/
// https://www.npmjs.com/package/@eslint/js
// https://github.com/eslint/json

import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import json from '@eslint/json';
import html from '@html-eslint/eslint-plugin';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  {
    ignores: ['node_modules', 'dist'],
  },

  {
    files: ['**/*.json'],
    ignores: ['package-lock.json'],
    plugins: { json },
    language: 'json/json',
    extends: ['json/recommended'],
  },

  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },

  {
    files: ['**/*.html'],
    plugins: { html },
    extends: ['html/recommended'],
    language: 'html/html',
    rules: {
      // Formatting rules — disabled, Prettier handles these
      'html/indent': 'off',
      'html/no-extra-spacing-tags': 'off',
      'html/require-closing-tags': 'off',
      'html/attrs-newline': 'off',
    },
  },

  eslintPluginPrettierRecommended,
]);
