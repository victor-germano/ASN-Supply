import { describe, expect, it } from 'vitest';
import { buildPixBrCode, crc16, toPixTxid } from './pix-brcode';

/** Lê os campos EMV de volta (`ID + TAMANHO + VALOR`) — confere a estrutura sem depender de string mágica. */
function parseEmv(payload: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const length = Number(payload.slice(i + 2, i + 4));
    fields[id] = payload.slice(i + 4, i + 4 + length);
    i += 4 + length;
  }
  return fields;
}

const base = {
  key: 'loja@example.com',
  receiverName: 'Maria Souza',
  receiverCity: 'São Paulo',
  amountInCents: 54990,
  txid: 'ASN-4F2K9QZT',
};

describe('crc16', () => {
  it('bate com o valor de verificação padrão do CRC-16/CCITT-FALSE', () => {
    expect(crc16('123456789')).toBe('29B1');
  });
});

describe('toPixTxid', () => {
  it('remove tudo que não é letra ou número', () => {
    expect(toPixTxid('ASN-4F2K')).toBe('ASN4F2K');
  });

  it('usa o valor reservado "***" quando não sobra nada', () => {
    expect(toPixTxid('---')).toBe('***');
  });
});

describe('buildPixBrCode', () => {
  it('monta os campos obrigatórios do padrão do Banco Central', () => {
    const fields = parseEmv(buildPixBrCode(base));

    expect(fields['00']).toBe('01');
    expect(parseEmv(fields['26']!)).toEqual({ '00': 'br.gov.bcb.pix', '01': 'loja@example.com' });
    expect(fields['52']).toBe('0000');
    expect(fields['53']).toBe('986');
    expect(fields['54']).toBe('549.90');
    expect(fields['58']).toBe('BR');
    expect(fields['59']).toBe('Maria Souza');
    // Sem acento — vários apps de banco recusam.
    expect(fields['60']).toBe('Sao Paulo');
    expect(parseEmv(fields['62']!)).toEqual({ '05': 'ASN4F2K9QZT' });
  });

  it('termina com um CRC válido sobre o restante do código', () => {
    const code = buildPixBrCode(base);
    const withoutCrc = code.slice(0, -4);

    expect(withoutCrc.endsWith('6304')).toBe(true);
    expect(code.slice(-4)).toBe(crc16(withoutCrc));
  });

  it('corta nome e cidade nos limites do padrão (25 e 15)', () => {
    const fields = parseEmv(
      buildPixBrCode({
        ...base,
        receiverName: 'Maria Aparecida dos Santos Oliveira',
        receiverCity: 'São José dos Campos',
      }),
    );

    expect(fields['59']).toHaveLength(25);
    expect(fields['60']).toBe('Sao Jose dos Ca');
  });

  it('recusa valor zero ou fracionado (centavos sempre inteiros)', () => {
    expect(() => buildPixBrCode({ ...base, amountInCents: 0 })).toThrow();
    expect(() => buildPixBrCode({ ...base, amountInCents: 10.5 })).toThrow();
  });
});
