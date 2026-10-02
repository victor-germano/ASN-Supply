import { describe, expect, it } from 'vitest';
import {
  CLIENT_IP_HEADER,
  INTERNAL_KEY_HEADER,
  resolveThrottleIdentity,
} from './throttle-identity';

const KEY = 'chave-interna-de-teste-com-mais-de-32-caracteres';

describe('resolveThrottleIdentity', () => {
  it('sem chave interna configurada, usa sempre o IP da conexão', () => {
    expect(
      resolveThrottleIdentity({
        headers: { [CLIENT_IP_HEADER]: '9.9.9.9' },
        connectionIp: '1.1.1.1',
        internalKey: undefined,
      }),
    ).toEqual({ skip: false, tracker: '1.1.1.1' });
  });

  it('servidor do site com IP do visitante: limita por visitante', () => {
    expect(
      resolveThrottleIdentity({
        headers: { [INTERNAL_KEY_HEADER]: KEY, [CLIENT_IP_HEADER]: '200.10.20.30' },
        connectionIp: '127.0.0.1',
        internalKey: KEY,
      }),
    ).toEqual({ skip: false, tracker: '200.10.20.30' });
  });

  it('servidor do site sem visitante (cache de catálogo): não limita', () => {
    expect(
      resolveThrottleIdentity({
        headers: { [INTERNAL_KEY_HEADER]: KEY },
        connectionIp: '127.0.0.1',
        internalKey: KEY,
      }),
    ).toEqual({ skip: true });
  });

  it('IP forjado sem a chave é ignorado (não dá pra escapar do limite de login)', () => {
    expect(
      resolveThrottleIdentity({
        headers: { [CLIENT_IP_HEADER]: '5.5.5.5' },
        connectionIp: '6.6.6.6',
        internalKey: KEY,
      }),
    ).toEqual({ skip: false, tracker: '6.6.6.6' });
  });

  it('chave errada é tratada como requisição externa', () => {
    expect(
      resolveThrottleIdentity({
        headers: { [INTERNAL_KEY_HEADER]: KEY.replace('c', 'x'), [CLIENT_IP_HEADER]: '5.5.5.5' },
        connectionIp: '6.6.6.6',
        internalKey: KEY,
      }),
    ).toEqual({ skip: false, tracker: '6.6.6.6' });
  });
});
