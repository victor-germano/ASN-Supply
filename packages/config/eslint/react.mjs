// @ts-check
import { FlatCompat } from '@eslint/eslintrc';
import globals from 'globals';
import { baseConfig } from './base.mjs';

/**
 * Config para apps React/Next.js. `next/core-web-vitals` ainda é publicado
 * no formato "legado" (eslintrc), então usamos `FlatCompat` — a ponte
 * oficial recomendada pela própria Next.js para flat config — para
 * incorporá-lo. `baseDirectory` precisa ser a pasta do app consumidor
 * (onde `eslint-config-next` está instalado).
 *
 * @param {string} baseDirectory
 */
export function reactConfig(baseDirectory) {
  const compat = new FlatCompat({ baseDirectory });

  return [
    ...baseConfig,
    ...compat.extends('next/core-web-vitals'),
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        globals: { ...globals.browser },
      },
    },
  ];
}
