// @ts-check
import { baseConfig } from './base.mjs';

/** Config para o backend NestJS — decorators e DI dispensam algumas regras estritas de tipagem. */
export const nestjsConfig = [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
      // Desligada apenas aqui: o NestJS injeta dependências no construtor via
      // reflect-metadata (emitDecoratorMetadata), o que exige um import de
      // *valor* mesmo quando a análise estática do ESLint só enxerga o uso
      // como tipo. Um `import type` nesse caso compila, mas quebra a
      // injeção de dependência em runtime.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
