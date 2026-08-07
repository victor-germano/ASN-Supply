// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * Regras ESLint base compartilhadas por todo o monorepo (flat config,
 * ESLint 9). `next lint` foi descontinuado a partir do Next 15 — todos os
 * apps consomem ESLint diretamente via `eslint.config.mjs`.
 */
export const baseConfig = tseslint.config(
  {
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/coverage/**', '**/generated/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      // A regra core não entende `import type` separado (padrão exigido por
      // consistent-type-imports acima), que ela reporta como "duplicado".
      // consistent-type-imports já garante organização correta dos imports.
      'no-duplicate-imports': 'off',
    },
  },
);
