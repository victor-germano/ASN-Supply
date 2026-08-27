import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser, UserRole } from '@asn/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Roda depois de `JwtAuthGuard` na cadeia (`@UseGuards(JwtAuthGuard,
 * RolesGuard)`) — depende de `request.user` já populado. Sem `@Roles(...)`
 * na rota, deixa passar (nada a checar); com decorator, exige que o papel
 * do usuário autenticado esteja na lista.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    return !!request.user && requiredRoles.includes(request.user.role);
  }
}
