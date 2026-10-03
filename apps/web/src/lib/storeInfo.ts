/**
 * Dados públicos da loja, num lugar só. Quando o domínio próprio existir,
 * basta definir `NEXT_PUBLIC_CONTACT_EMAIL` (ex: contato@seudominio.com.br)
 * — rodapé, FAQ, trocas e privacidade passam a mostrar o novo endereço.
 */
export const STORE_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'asn.supply.commerce@gmail.com';
