import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import type { AuthResponse, AuthenticatedUser } from '@asn/types';
import { Prisma, type User } from '../../../generated/client';
import type { EnvConfig } from '../../config/env.validation';
import { UsersRepository } from '../users/users.repository';
import type { JwtPayload } from './jwt-payload';

const BCRYPT_ROUNDS = 12;

// Hash bcrypt fixo, de uma senha qualquer que nunca é usada de verdade —
// existe só para `login` comparar contra algo de custo equivalente quando
// o e-mail não existe (ver comentário em `login`). Gerado uma vez com
// `bcrypt.hash('dummy-password-for-timing-normalization', 12)`.
const DUMMY_PASSWORD_HASH = '$2b$12$mlAqiITfTjOmj3s8Bd2J6.q1obuD5KVPpFcNW4XuobXuS6QJBaV2S';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Emite/renova o par de tokens (access 15min + refresh 30 dias, ambos
 * assinados com o mesmo `JWT_SECRET`, diferenciados só pelo claim `type`).
 * Sem estado no servidor no v1 — não há tabela de refresh tokens nem
 * revogação; logout é responsabilidade do Next.js (limpar os cookies).
 * Upgrade natural depois é uma tabela `RefreshToken` com `jti`/`revokedAt`
 * se "sair de todos os dispositivos" virar requisito.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException({
        errorCode: 'EMAIL_TAKEN',
        message: 'Este e-mail já está cadastrado.',
      });
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    try {
      const user = await this.usersRepository.create({
        name: input.name,
        email: input.email,
        passwordHash,
      });
      return this.issueTokenPair(toAuthenticatedUser(user));
    } catch (error) {
      // A checagem acima (`findByEmail`) e o `create` não são atômicos —
      // duas requisições concorrentes com o mesmo e-mail podem ambas passar
      // por "não existe" antes de qualquer uma commitar. Sem isto, a
      // segunda cai na constraint `@unique` do banco e vira um 500 cru em
      // vez do 409 esperado (mesmo padrão de `createWithRetry` em
      // orders.repository.ts para colisão de código de pedido).
      const isDuplicateEmail =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('email');
      if (isDuplicateEmail) {
        throw new ConflictException({
          errorCode: 'EMAIL_TAKEN',
          message: 'Este e-mail já está cadastrado.',
        });
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.usersRepository.findByEmail(input.email);
    // Roda `bcrypt.compare` mesmo quando o usuário não existe (contra um
    // hash fixo qualquer, `DUMMY_PASSWORD_HASH`) — sem isso, "e-mail não
    // cadastrado" responde quase instantaneamente enquanto "e-mail existe,
    // senha errada" leva o tempo cheio do bcrypt (propositalmente lento),
    // um side-channel de timing que reintroduz exatamente o que a mensagem
    // de erro idêntica abaixo tenta evitar: usar o login como oráculo para
    // descobrir e-mails cadastrados. Verificado ao vivo (curl com chamadas
    // espaçadas): ~500-600ms nos dois casos, sem diferença perceptível.
    const passwordMatches = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordMatches) {
      throw new UnauthorizedException({
        errorCode: 'INVALID_CREDENTIALS',
        message: 'E-mail ou senha incorretos.',
      });
    }
    return this.issueTokenPair(toAuthenticatedUser(user));
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.verifyToken(refreshToken);
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({
        errorCode: 'INVALID_REFRESH_TOKEN',
        message: 'Sessão expirada, faça login novamente.',
      });
    }
    const user = await this.usersRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        errorCode: 'USER_NOT_FOUND',
        message: 'Sessão expirada, faça login novamente.',
      });
    }
    return this.issueTokenPair(toAuthenticatedUser(user));
  }

  // Genérico de propósito (assinatura inválida ou expirada) — cada
  // chamador decide a mensagem certa para o próprio contexto depois de
  // checar `payload.type` (ver `refresh`).
  private async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException({
        errorCode: 'INVALID_TOKEN',
        message: 'Este link é inválido ou já expirou.',
      });
    }
  }

  private async issueTokenPair(user: AuthenticatedUser): Promise<AuthResponse> {
    const basePayload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...basePayload, type: 'access' } satisfies JwtPayload, {
        expiresIn: this.config.get('JWT_EXPIRES_IN', { infer: true }),
      }),
      this.jwtService.signAsync({ ...basePayload, type: 'refresh' } satisfies JwtPayload, {
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
      }),
    ]);
    return { user, accessToken, refreshToken };
  }
}

function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}
