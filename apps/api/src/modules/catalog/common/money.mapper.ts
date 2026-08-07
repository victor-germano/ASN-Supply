import type { Money } from '@asn/types';

/** Converte um valor em centavos (armazenado no banco) para o contrato `Money` da API. */
export function toMoney(amountInCents: number): Money {
  return { amountInCents, currency: 'BRL' };
}
