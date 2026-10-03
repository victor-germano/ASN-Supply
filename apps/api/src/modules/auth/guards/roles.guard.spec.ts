import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '@asn/types';
import { RolesGuard } from './roles.guard';

function fakeReflector(requiredRoles: AuthenticatedUser['role'][] | undefined): Reflector {
  return { getAllAndOverride: () => requiredRoles } as unknown as Reflector;
}

function fakeContext(user?: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const ADMIN: AuthenticatedUser = {
  id: 'u1',
  name: 'Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  avatarUrl: null,
  emailVerifiedAt: null,
  phone: null,
  marketingOptIn: false,
};
const CUSTOMER: AuthenticatedUser = { ...ADMIN, id: 'u2', role: 'CUSTOMER' };

describe('RolesGuard', () => {
  it('permite quando a rota não tem @Roles(...)', () => {
    const guard = new RolesGuard(fakeReflector(undefined));
    expect(guard.canActivate(fakeContext(CUSTOMER))).toBe(true);
  });

  it('permite quando o papel do usuário está na lista exigida', () => {
    const guard = new RolesGuard(fakeReflector(['ADMIN']));
    expect(guard.canActivate(fakeContext(ADMIN))).toBe(true);
  });

  it('rejeita quando o papel do usuário não está na lista exigida', () => {
    const guard = new RolesGuard(fakeReflector(['ADMIN']));
    expect(guard.canActivate(fakeContext(CUSTOMER))).toBe(false);
  });

  it('rejeita quando não há usuário autenticado (JwtAuthGuard deveria rodar antes)', () => {
    const guard = new RolesGuard(fakeReflector(['ADMIN']));
    expect(guard.canActivate(fakeContext(undefined))).toBe(false);
  });
});
