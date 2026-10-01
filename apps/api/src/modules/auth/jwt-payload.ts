import type { UserRole } from '@asn/types';

export type JwtTokenType = 'access' | 'refresh' | 'password_reset' | 'email_verification';

/**
 * Um único `JWT_SECRET` assina todos os tipos de token — `type` é o que os
 * diferencia. `JwtStrategy` só aceita `type: 'access'`; `AuthService.refresh`
 * só aceita `type: 'refresh'`; um token de um tipo nunca serve para outro
 * propósito.
 *
 * `pwv` (password version) existe em `password_reset` e `refresh` — um fragmento
 * curto de hash de `user.passwordHash` no momento em que o link foi
 * emitido. Sem tabela de tokens de uso único: ao redefinir a senha de
 * verdade, `passwordHash` muda, então `pwv` do link antigo nunca mais bate
 * — o link se invalida sozinho depois do primeiro uso real, sem precisar
 * marcar nada no banco. No `refresh`, o mesmo raciocínio derruba as
 * sessões abertas antes da troca de senha. Ver `computePasswordVersion` em
 * `auth.service.ts`.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: JwtTokenType;
  pwv?: string;
}
