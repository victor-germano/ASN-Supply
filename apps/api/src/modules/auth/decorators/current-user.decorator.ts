import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '@asn/types';

/**
 * Lê `request.user`, populado por `JwtAuthGuard`/`OptionalJwtAuthGuard`
 * (via `JwtStrategy.validate`). Com o guard opcional, pode vir `undefined`
 * — o tipo aqui reflete isso, cada controller decide se trata como opcional.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    return request.user;
  },
);
