import { beforeEach, describe, expect, it } from 'vitest';
import { LOGIN_LOCK_MS, LOGIN_MAX_FAILURES, LoginLockout } from './login-lockout';

describe('LoginLockout', () => {
  let now: number;
  let lockout: LoginLockout;

  beforeEach(() => {
    now = 1_000_000;
    lockout = new LoginLockout(() => now);
  });

  it('trava o e-mail depois do limite de erros, sem diferenciar maiúsculas', () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++) lockout.recordFailure('Ana@Example.com');
    expect(lockout.isLocked('ana@example.com')).toBe(false);
    lockout.recordFailure('ana@example.com');
    expect(lockout.isLocked('ANA@example.com')).toBe(true);
  });

  it('destrava sozinho depois do tempo de bloqueio', () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) lockout.recordFailure('ana@example.com');
    now += LOGIN_LOCK_MS + 1;
    expect(lockout.isLocked('ana@example.com')).toBe(false);
  });

  it('erros espalhados além da janela não somam', () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      lockout.recordFailure('ana@example.com');
      now += 3 * 60 * 1000;
    }
    expect(lockout.isLocked('ana@example.com')).toBe(false);
  });

  it('clear (redefinição de senha) destrava na hora', () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) lockout.recordFailure('ana@example.com');
    lockout.clear('ana@example.com');
    expect(lockout.isLocked('ana@example.com')).toBe(false);
  });
});
