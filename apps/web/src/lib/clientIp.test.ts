import { describe, expect, it } from 'vitest';
import { pickClientIp } from './clientIp';

describe('pickClientIp', () => {
  it('ignora o valor forjado pelo visitante e usa o que o proxy acrescentou', () => {
    expect(pickClientIp('6.6.6.6, 203.0.113.9', null)).toBe('203.0.113.9');
  });

  it('valor único (hospedagem que sobrescreve o header)', () => {
    expect(pickClientIp('203.0.113.9', null)).toBe('203.0.113.9');
  });

  it('cai para x-real-ip e depois para "unknown"', () => {
    expect(pickClientIp(null, ' 198.51.100.1 ')).toBe('198.51.100.1');
    expect(pickClientIp(' , ', null)).toBe('unknown');
  });
});
