import type { Money } from '@asn/types';

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata um valor `Money` (centavos) como moeda brasileira: `{ amountInCents: 89900 }` → "R$ 899,00". */
export function formatMoney(money: Money): string {
  return formatter.format(money.amountInCents / 100);
}

/**
 * Reais digitados num `<input type="number">` → centavos inteiros pra API.
 * `Math.round` depois do `* 100` porque float não representa centavos
 * exatos (`499.9 * 100` = `49989.99999999999`).
 */
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}

/** Inverso de `reaisToCents` — pra preencher o formulário de edição. */
export function centsToReais(cents: number): number {
  return cents / 100;
}
