import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '@asn/types';
import type { EnvConfig } from '../../../config/env.validation';
import { UsersRepository } from '../../users/users.repository';
import type { JwtPayload } from '../jwt-payload';

/**
 * Extrai só de `Authorization: Bearer <token>` — nunca de cookie. A API
 * fica stateless/reutilizável por qualquer client (web hoje, mobile
 * amanhã); é o Next.js quem decide guardar o token num cookie httpOnly e
 * reenviá-lo como header (ver `apiClient.ts`).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<EnvConfig, true>,
    private readonly usersRepository: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  /**
   * Revalida o usuário no banco a cada request em vez de confiar cegamente
   * no payload — um token de 15min já emitido continua "válido" mesmo que
   * o usuário tenha sido desativado/promovido/rebaixado nesse meio-tempo;
   * essa checagem pega isso na próxima request, não só no próximo login.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException({
        errorCode: 'INVALID_TOKEN_TYPE',
        message: 'Sessão inválida, faça login novamente.',
      });
    }
    const user = await this.usersRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        errorCode: 'USER_NOT_FOUND',
        message: 'Sessão inválida, faça login novamente.',
      });
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      phone: user.phone,
      marketingOptIn: user.marketingOptIn,
    };
  }
}
