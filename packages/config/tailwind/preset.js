const tokens = require('./tokens');

/**
 * Preset Tailwind compartilhado. Qualquer app (web, admin) que precise da
 * identidade visual da ASN Supply importa este preset em vez de redefinir
 * tema — garante consistência entre storefront e futuros produtos (ex.
 * painel administrativo).
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: 'class',
  content: [],
  theme: {
    screens: tokens.screens,
    extend: {
      colors: tokens.colors,
      fontFamily: tokens.fontFamily,
      spacing: tokens.spacing,
      borderRadius: tokens.borderRadius,
      letterSpacing: tokens.letterSpacing,
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      maxWidth: {
        content: '1440px',
      },
    },
  },
  plugins: [],
};
