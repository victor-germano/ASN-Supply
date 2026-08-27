/**
 * Mesma função de `AdminProductsRepository` (não exportada de lá) — pequena
 * o bastante pra duplicar em vez de acoplar dois módulos administrativos só
 * por causa disto. "Tênis Marrow — Édição" -> "tenis-marrow-edicao".
 * `\p{Diacritic}` (não uma faixa `̀-ͯ` escrita à mão) pra não depender de
 * digitar caractere combinante literal num regex.
 */
export function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'item';
}
