import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '@asn/types';

/**
 * Mesma estratégia `jwt`, mas nunca lança 401 — sem token, token inválido
 * ou expirado, `request.user` só fica `undefined` em vez de barrar a
 * request. Existe para endpoints que atendem convidado E autenticado com
 * uma única rota (ex: `POST /orders`) sem duplicar controller.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = AuthenticatedUser>(_err: unknown, user: TUser): TUser | undefined {
    return user || undefined;
  }
}
