/**
 * Monta o BR Code de um PIX estático (o texto "copia e cola", que também
 * é o conteúdo do QR Code) seguindo o Manual de Padrões para Iniciação do
 * PIX do Banco Central — formato EMV-MPM: uma sequência de campos
 * `ID (2 dígitos) + TAMANHO (2 dígitos) + VALOR`, fechada por um CRC16.
 *
 * Função pura e sem dependência: é a única parte do fluxo de PIX que,
 * errada, faz o app do banco recusar o código — por isso isolada e
 * testada à parte (`pix-brcode.spec.ts`).
 */

export interface PixBrCodeInput {
  /** Chave PIX: CPF/CNPJ só números, e-mail, telefone `+55DDDNUMERO` ou chave aleatória. */
  key: string;
  receiverName: string;
  receiverCity: string;
  amountInCents: number;
  /** Identificador que aparece no extrato do recebedor — usamos o código do pedido. */
  txid: string;
}

const MAX_NAME_LENGTH = 25;
const MAX_CITY_LENGTH = 15;
const MAX_TXID_LENGTH = 25;

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

/**
 * O BR Code só aceita ASCII nos campos de texto — vários apps de banco
 * recusam (ou mostram lixo) com acento. "São Paulo" vira "Sao Paulo".
 */
function toAscii(value: string, maxLength: number): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, maxLength);
}

/** txid: só letras e números, até 25 — o código do pedido "ASN-4F2K" vira "ASN4F2K". */
export function toPixTxid(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]/g, '').slice(0, MAX_TXID_LENGTH);
  // "***" = "sem identificador", valor reservado pelo próprio padrão.
  return cleaned || '***';
}

/** CRC-16/CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF) — o exigido pelo padrão. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixBrCode(input: PixBrCodeInput): string {
  if (!Number.isInteger(input.amountInCents) || input.amountInCents <= 0) {
    throw new Error(`Valor de PIX inválido: ${input.amountInCents}`);
  }

  const merchantAccount =
    field('00', 'br.gov.bcb.pix') + field('01', input.key.trim().replace(/\s+/g, ''));

  const payload =
    field('00', '01') +
    field('26', merchantAccount) +
    field('52', '0000') + // categoria do comerciante: "não informada"
    field('53', '986') + // moeda: real
    field('54', (input.amountInCents / 100).toFixed(2)) +
    field('58', 'BR') +
    field('59', toAscii(input.receiverName, MAX_NAME_LENGTH)) +
    field('60', toAscii(input.receiverCity, MAX_CITY_LENGTH)) +
    field('62', field('05', toPixTxid(input.txid))) +
    '6304'; // ID + tamanho do próprio CRC entram no cálculo dele

  return payload + crc16(payload);
}
