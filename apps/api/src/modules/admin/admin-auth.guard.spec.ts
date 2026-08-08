import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { AdminAuthGuard } from './admin-auth.guard';

function fakeConfig(apiKey: string | undefined): ConfigService<EnvConfig, true> {
  return { get: () => apiKey } as unknown as ConfigService<EnvConfig, true>;
}

function fakeContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) => (name.toLowerCase() === 'authorization' ? authHeader : undefined),
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminAuthGuard', () => {
  it('é passthrough quando ADMIN_API_KEY não está configurada', () => {
    const guard = new AdminAuthGuard(fakeConfig(undefined));
    expect(guard.canActivate(fakeContext())).toBe(true);
  });

  it('rejeita quando o header Authorization está ausente', () => {
    const guard = new AdminAuthGuard(fakeConfig('secret-key'));
    expect(() => guard.canActivate(fakeContext())).toThrow(UnauthorizedException);
  });

  it('rejeita quando o token está incorreto', () => {
    const guard = new AdminAuthGuard(fakeConfig('secret-key'));
    expect(() => guard.canActivate(fakeContext('Bearer wrong-token'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita quando o scheme não é Bearer', () => {
    const guard = new AdminAuthGuard(fakeConfig('secret-key'));
    expect(() => guard.canActivate(fakeContext('Basic secret-key'))).toThrow(UnauthorizedException);
  });

  it('permite quando o token está correto', () => {
    const guard = new AdminAuthGuard(fakeConfig('secret-key'));
    expect(guard.canActivate(fakeContext('Bearer secret-key'))).toBe(true);
  });

  it('avisa apenas uma vez quando a chave não está configurada em chamadas repetidas', () => {
    const guard = new AdminAuthGuard(fakeConfig(undefined));
    const warnSpy = vi.spyOn(Reflect.get(guard, 'logger'), 'warn');
    guard.canActivate(fakeContext());
    guard.canActivate(fakeContext());
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
