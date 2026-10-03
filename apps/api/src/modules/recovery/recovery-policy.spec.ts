import { describe, expect, it } from 'vitest';
import {
  decideRecovery,
  firstNameOf,
  isWithinSendWindow,
  type RecoveryCandidate,
} from './recovery-policy';

/** 14:00 em Brasília (UTC-3) = 17:00 UTC. */
const NOW = new Date('2026-10-02T17:00:00Z');
const DELAY = 60;
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

const base: RecoveryCandidate = {
  marketingOptIn: true,
  phone: '+5511998887766',
  lastActivityAt: minutesAgo(90),
  lastOrderAt: null,
  lastReminderAt: null,
};

describe('decideRecovery', () => {
  it('envia quando o cliente autorizou, saiu há mais de 1h e não comprou', () => {
    expect(decideRecovery(base, NOW, DELAY)).toEqual({ send: true });
  });

  it.each<[string, Partial<RecoveryCandidate>, string]>([
    ['sem consentimento', { marketingOptIn: false }, 'no-consent'],
    ['sem celular', { phone: null }, 'no-phone'],
    ['ainda navegando (menos de 1h)', { lastActivityAt: minutesAgo(30) }, 'still-browsing'],
    ['interesse velho (mais de 24h)', { lastActivityAt: minutesAgo(25 * 60) }, 'too-old'],
    ['já comprou depois de ver', { lastOrderAt: minutesAgo(45) }, 'purchased'],
    ['lembrete recente (menos de 7 dias)', { lastReminderAt: minutesAgo(3 * 24 * 60) }, 'cooldown'],
  ])('não envia: %s', (_caso, override, reason) => {
    expect(decideRecovery({ ...base, ...override }, NOW, DELAY)).toEqual({ send: false, reason });
  });

  it('compra ANTES de ver o produto não conta como conversão', () => {
    expect(decideRecovery({ ...base, lastOrderAt: minutesAgo(3 * 60) }, NOW, DELAY)).toEqual({
      send: true,
    });
  });

  it('lembrete de mais de 7 dias atrás não impede um novo', () => {
    expect(
      decideRecovery({ ...base, lastReminderAt: minutesAgo(8 * 24 * 60) }, NOW, DELAY),
    ).toEqual({ send: true });
  });

  it('não envia de madrugada (horário de Brasília)', () => {
    const madrugada = new Date('2026-10-02T06:00:00Z'); // 03:00 em Brasília
    const candidate = { ...base, lastActivityAt: new Date(madrugada.getTime() - 90 * 60_000) };
    expect(decideRecovery(candidate, madrugada, DELAY)).toEqual({
      send: false,
      reason: 'quiet-hours',
    });
  });
});

describe('isWithinSendWindow', () => {
  it.each([
    ['2026-10-02T12:00:00Z', true], // 09:00 BRT — abre
    ['2026-10-02T11:59:00Z', false], // 08:59 BRT
    ['2026-10-02T22:59:00Z', true], // 19:59 BRT
    ['2026-10-02T23:00:00Z', false], // 20:00 BRT — fecha
  ])('%s → %s', (iso, expected) => {
    expect(isWithinSendWindow(new Date(iso))).toBe(expected);
  });
});

describe('firstNameOf', () => {
  it('pega só o primeiro nome', () => {
    expect(firstNameOf('  Maria Aparecida Souza ')).toBe('Maria');
  });
});
