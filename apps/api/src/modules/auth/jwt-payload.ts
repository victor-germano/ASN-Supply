import type { UserRole } from '@asn/types';

export type JwtTokenType = 'access' | 'refresh';

/**
 * Um único `JWT_SECRET` assina todos os tipos de token — `type` é o que os
 * diferencia. `JwtStrategy` só aceita `type: 'access'`; `AuthService.refresh`
 * só aceita `type: 'refresh'`; um token de um tipo nunca serve para outro
 * propósito.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: JwtTokenType;
}
