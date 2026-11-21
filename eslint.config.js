import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'blob-report',
      '.lighthouseci',
      'backups',
      'node_modules',
    ],
  },

  // Browser app (React + TypeScript)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Tests may mix component and helper exports freely
  {
    files: ['src/test/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // Serverless functions, E2E specs, build config (Node runtime)
  {
    files: [
      'api/**/*.ts',
      'e2e/**/*.ts',
      '*.config.ts',
      'vite-content-plugin.ts',
    ],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },

  // Plain Node scripts
  {
    files: ['scripts/**/*.mjs', '*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
);
