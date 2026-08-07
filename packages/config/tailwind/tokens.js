/**
 * Design tokens — ASN Supply
 *
 * Fonte única de verdade para identidade visual da marca. Nada de cor, fonte
 * ou espaçamento deve ser hardcoded em componente: tudo referencia estes
 * tokens via Tailwind (packages/config/tailwind/preset.js) ou via
 * `@asn/ui/tokens` no código TS.
 *
 * Conceito: minimalista, premium, verde-oliva/off-white/preto, muito
 * espaço em branco, tipografia com hierarquia forte.
 */

/** Escala de verde-oliva — cor de assinatura da marca. 500 é a base. */
const olive = {
  50: '#F6F6F1',
  100: '#ECEBE0',
  200: '#D7D5BF',
  300: '#BEBB99',
  400: '#A3A177',
  500: '#83815C',
  600: '#6B6A4C',
  700: '#55543D',
  800: '#403F2F',
  900: '#2B2A20',
  950: '#1B1A14',
};

/** Off-white / ecru usado como fundo predominante das páginas. */
const bone = {
  50: '#FDFCFA',
  100: '#F7F5F0',
  200: '#F0ECE3',
  300: '#E6E0D4',
};

/** Preto premium (não é #000 puro — mais quente, mais macio). */
const ink = {
  DEFAULT: '#16160F',
  soft: '#26251C',
  muted: '#4A4938',
};

/** Cores de estado, usadas com moderação e sempre em tom dessaturado. */
const feedback = {
  success: '#3F6B4E',
  error: '#8C3B2E',
  warning: '#A9772F',
  info: '#3B5B6B',
};

const fontFamily = {
  display: ['"Cormorant Garamond"', 'serif'],
  sans: ['Inter', 'system-ui', 'sans-serif'],
};

/** Espaçamento estendido para seções amplas (identidade "muito espaço em branco"). */
const spacing = {
  18: '4.5rem',
  22: '5.5rem',
  26: '6.5rem',
  30: '7.5rem',
  34: '8.5rem',
  section: 'clamp(4rem, 8vw, 9rem)',
  gutter: 'clamp(1.25rem, 4vw, 4rem)',
};

const borderRadius = {
  none: '0',
  sm: '2px',
  DEFAULT: '4px',
  md: '6px',
  lg: '10px',
  xl: '16px',
  full: '9999px',
};

const letterSpacing = {
  tightest: '-0.03em',
  tight: '-0.015em',
  normal: '0',
  wide: '0.04em',
  wider: '0.08em',
  widest: '0.2em',
};

const screens = {
  xs: '375px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1800px',
};

module.exports = {
  colors: {
    olive,
    bone,
    ink,
    white: '#FFFFFF',
    black: '#0A0A07',
    ...feedback,
  },
  fontFamily,
  spacing,
  borderRadius,
  letterSpacing,
  screens,
};
