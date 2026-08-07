import { nestjsConfig } from '@asn/config/eslint/nestjs.mjs';

export default [{ ignores: ['dist/**', 'generated/**'] }, ...nestjsConfig];
