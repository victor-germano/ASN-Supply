import { describe, expect, it } from 'vitest';
import { ServiceUnavailableException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { EnvConfig } from '../../../config/env.validation';
import { GoogleAuthGuard } from './google-auth.guard';

function fakeConfig(values: Partial<EnvConfig>): ConfigService<EnvConfig, true> {
  return {
    get: (key: string) => (values as Record<string, unknown>)[key],
  } as unknown as ConfigService<EnvConfig, true>;
}

function fakeContext(query: Record<string, unknown> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ query }) as unknown as Request }),
  } as unknown as ExecutionContext;
}

describe('GoogleAuthGuard', () => {
  describe('canActivate', () => {
    it('lança 503 sem GOOGLE_OAUTH_CLIENT_ID/_SECRET configuradas', () => {
      const guard = new GoogleAuthGuard(fakeConfig({}));
      expect(() => guard.canActivate(fakeContext())).toThrow(ServiceUnavailableException);
    });

    it('lança 503 quando só uma das duas está configurada', () => {
      const guard = new GoogleAuthGuard(fakeConfig({ GOOGLE_OAUTH_CLIENT_ID: 'x' }));
      expect(() => guard.canActivate(fakeContext())).toThrow(ServiceUnavailableException);
    });
  });

  describe('getAuthenticateOptions', () => {
    const guard = new GoogleAuthGuard(
      fakeConfig({ GOOGLE_OAUTH_CLIENT_ID: 'x', GOOGLE_OAUTH_CLIENT_SECRET: 'y' }),
    );

    it('repassa um `next` interno seguro como `state`', () => {
      expect(guard.getAuthenticateOptions(fakeContext({ next: '/checkout' }))).toEqual({
        state: '/checkout',
      });
    });

    it('usa o padrão sem `next` nenhum', () => {
      expect(guard.getAuthenticateOptions(fakeContext({}))).toEqual({
        state: '/conta/pedidos',
      });
    });

    it('rejeita `next` protocol-relative (open redirect) e cai no padrão', () => {
      expect(guard.getAuthenticateOptions(fakeContext({ next: '//evil.com' }))).toEqual({
        state: '/conta/pedidos',
      });
    });

    it('rejeita `next` absoluto (outro host) e cai no padrão', () => {
      expect(guard.getAuthenticateOptions(fakeContext({ next: 'https://evil.com' }))).toEqual({
        state: '/conta/pedidos',
      });
    });
  });
});
