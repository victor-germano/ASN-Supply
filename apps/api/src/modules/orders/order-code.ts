const SUFFIX_LENGTH = 8;
const SUFFIX_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Código legível do pedido (ex: ASN-M4X9K2QW) — exibido ao cliente e usado
 * em contato de suporte; não é o `id` interno (cuid), que nunca aparece na
 * UI. `Math.random().toString(36)` sozinho não garante 8 caracteres (sobra
 * varia conforme os dígitos menos significativos do double gerado, podendo
 * vir mais curta ou até vazia) — sorteando cada caractere do alfabeto temos
 * sempre o comprimento (e a entropia: 36^8) documentados. Colisão continua
 * desprezível no volume de uma loja, e a coluna `code` é `@unique` no banco
 * como rede de segurança (ver retry em `OrdersRepository.create`).
 */
export function generateOrderCode(): string {
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)];
  }
  return `ASN-${suffix}`;
}
