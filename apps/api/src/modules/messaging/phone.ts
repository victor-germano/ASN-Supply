/**
 * Celular brasileiro → E.164 (`+5511998887766`), ou `null` se não for um
 * celular válido. Aceita o que as pessoas digitam: com/sem máscara, com/sem
 * `+55`/`55`. Regra: DDD de 11 a 99 (nenhum começa com 0) + nono dígito 9 +
 * 8 dígitos — telefone fixo é recusado, porque SMS não chega nele.
 */
export function normalizeBrazilianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length !== 11) return null;

  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || digits[1] === '0') return null;
  if (digits[2] !== '9') return null;

  return `+55${digits}`;
}

/** `+5511998887766` → `(11) 9****-7766` — pra mostrar sem expor o número inteiro. */
export function maskBrazilianMobile(e164: string): string {
  const digits = e164.replace(/\D/g, '').slice(-11);
  return `(${digits.slice(0, 2)}) ${digits[2]}****-${digits.slice(-4)}`;
}
