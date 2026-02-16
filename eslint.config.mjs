
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import importPlugin from 'eslint-plugin-import';
const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  {
    ignores: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**'],
  },
  eslint.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  // Disable import-based rules inside infra/http implementation folders
  {
    files: ['./src/tasks/infrastructure/**/*.ts', './src/tasks/interfaces/http/**/*.ts'],
    rules: {
      'import/no-restricted-paths': 'off',
      'import/no-extraneous-dependencies': 'off',
      'no-restricted-imports': 'off',
    },
  },
  // General rules for TypeScript files
  {
    files: ["**/*.ts"],
    plugins: {
      import: importPlugin, // Define the plugin with the 'import' namespace
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      'prettier/prettier': ['error', { endOfLine: 'auto' }],

      // Project layering: warn when inner layers import from forbidden outer layers
      'import/no-restricted-paths': [
        'warn',
        {
          zones: [
            { target: './src/tasks/domain', from: './src/tasks/infrastructure' },
            { target: './src/tasks/domain', from: './src/tasks/interfaces/http' },
            { target: './src/tasks/application', from: './src/tasks/infrastructure' },
          ],
        },
      ],

      // Avoid deep relative imports; prefer tsconfig paths or shorter imports
      'no-restricted-imports': [
        'warn',
        { patterns: ['../../*', '../../../*', '../../../../*'] },
      ],

      // Enforce exported DI tokens naming: UPPER_SNAKE and ending with _TOKEN
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variable',
          modifiers: ['exported'],
          format: ['UPPER_CASE'],
          custom: { regex: '.*_TOKEN$', match: true },
        },
      ],

      // Discourage usage of infra-only packages in domain (example)
      'import/no-extraneous-dependencies': [
        'warn',
        { devDependencies: false, optionalDependencies: false, peerDependencies: false },
      ],
    },
  },
);
