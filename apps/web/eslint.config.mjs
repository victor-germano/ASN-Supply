import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reactConfig } from '@asn/config/eslint/react.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = [{ ignores: ['.next/**', 'next-env.d.ts'] }, ...reactConfig(__dirname)];

export default config;
