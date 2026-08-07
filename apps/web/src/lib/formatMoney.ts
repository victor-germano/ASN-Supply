import type { Money } from '@asn/types';

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata um valor `Money` (centavos) como moeda brasileira: `{ amountInCents: 89900 }` → "R$ 899,00". */
export function formatMoney(money: Money): string {
  return formatter.format(money.amountInCents / 100);
}
