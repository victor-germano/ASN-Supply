import { createHash } from 'node:crypto';
import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import type { AuthResponse, AuthenticatedUser } from '@asn/types';
import { Prisma, type User } from '../../../generated/client';
import type { EnvConfig } from '../../config/env.validation';
import { UsersRepository } from '../users/users.repository';
import { EmailSender } from '../email/email-sender';
import { emailVerificationEmail, passwordResetEmail } from '../email/templates';
import type { JwtPayload } from './jwt-payload';
import type { GoogleProfile } from './strategies/google.strategy';

const PASSWORD_RESET_EXPIRES_IN = '30m';
const EMAIL_VERIFICATION_EXPIRES_IN = '24h';

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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly emailSender: EmailSender,
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
      // Fire-and-forget: uma falha de envio (provedor fora do ar, chave
      // ainda não configurada) não pode impedir o cadastro em si — o
      // usuário sempre pode pedir reenvio depois (`requestEmailVerification`).
      this.sendVerificationEmail(user).catch((error) =>
        this.logger.error(`Falha ao enviar e-mail de verificação para "${user.email}": ${error}`),
      );
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

  /**
   * `GoogleAuthGuard`/`GoogleStrategy` já validaram a conta do Google de
   * verdade antes disto rodar — aqui é só resolver pra qual `User` local
   * esse `googleId` corresponde. Três casos: (1) já logou com Google antes
   * — acha direto pelo `googleId`; (2) primeira vez, mas já existe conta
   * com senha no mesmo e-mail — associa o `googleId` a ela em vez de criar
   * duplicata; (3) primeira vez de verdade — cria conta nova, sem senha
   * (`passwordHash` fica `null`, mesmo formato de "conta só-OAuth" que
   * `login`/`requestPasswordReset` já tratam em outros pontos deste
   * arquivo).
   */
  async loginWithGoogle(profile: GoogleProfile): Promise<AuthResponse> {
    let user = await this.usersRepository.findByGoogleId(profile.googleId);
    if (!user) {
      const existingByEmail = await this.usersRepository.findByEmail(profile.email);
      user = existingByEmail
        ? await this.usersRepository.linkGoogleAccount(existingByEmail.id, profile.googleId)
        : await this.usersRepository.createFromGoogle({
            name: profile.name,
            email: profile.email,
            googleId: profile.googleId,
            avatarUrl: profile.avatarUrl,
          });
    }
    return this.issueTokenPair(toAuthenticatedUser(user));
  }

  /**
   * Sempre resolve em sucesso (nunca revela se o e-mail existe — mesma
   * defesa contra enumeração de `login`, só que sem o custo de timing
   * ali: aqui não há comparação de senha nenhuma para vazar por tempo).
   * Sem usuário com esse e-mail, é um no-op silencioso.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    // `!user.passwordHash` = conta só-OAuth (googleId/appleId, sem senha
    // própria pra redefinir) — tratado como "não encontrado" pelo mesmo
    // motivo de não revelar a existência do e-mail: não faz sentido
    // devolver 204 só pra depois o link falhar com uma mensagem diferente.
    if (!user || !user.passwordHash) return;

    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'password_reset',
        pwv: computePasswordVersion(user.passwordHash),
      } satisfies JwtPayload,
      { expiresIn: PASSWORD_RESET_EXPIRES_IN },
    );
    const resetUrl = `${this.config.get('WEB_APP_URL', { infer: true })}/redefinir-senha?token=${token}`;
    const { subject, html } = passwordResetEmail(resetUrl);
    await this.emailSender.send({ to: user.email, subject, html });
  }

  /** Sucesso = sessão nova (login automático), mesma UX de acabar de logar. */
  async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
    const payload = await this.verifyToken(token);
    const user = await this.usersRepository.findById(payload.sub);
    // `pwv` comparado contra o hash ATUAL: se a senha já foi redefinida
    // desde que este link foi emitido, `computePasswordVersion` não bate
    // mais — o link se invalida sozinho depois do primeiro uso real, sem
    // precisar de uma tabela de tokens marcados como usados.
    if (
      payload.type !== 'password_reset' ||
      !user ||
      !user.passwordHash ||
      payload.pwv !== computePasswordVersion(user.passwordHash)
    ) {
      throw new UnauthorizedException({
        errorCode: 'INVALID_RESET_TOKEN',
        message: 'Este link de redefinição é inválido ou já expirou.',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const updated = await this.usersRepository.updatePasswordHash(user.id, passwordHash);
    return this.issueTokenPair(toAuthenticatedUser(updated));
  }

  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user || user.emailVerifiedAt) return;
    await this.sendVerificationEmail(user);
  }

  async verifyEmail(token: string): Promise<void> {
    const payload = await this.verifyToken(token);
    if (payload.type !== 'email_verification') {
      throw new UnauthorizedException({
        errorCode: 'INVALID_VERIFICATION_TOKEN',
        message: 'Este link de verificação é inválido ou já expirou.',
      });
    }
    await this.usersRepository.markEmailVerified(payload.sub);
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'email_verification',
      } satisfies JwtPayload,
      { expiresIn: EMAIL_VERIFICATION_EXPIRES_IN },
    );
    const verifyUrl = `${this.config.get('WEB_APP_URL', { infer: true })}/verificar-email?token=${token}`;
    const { subject, html } = emailVerificationEmail(verifyUrl);
    await this.emailSender.send({ to: user.email, subject, html });
  }

  // Genérico de propósito (assinatura inválida ou expirada, qualquer tipo
  // de token) — cada chamador decide a mensagem certa para o próprio
  // contexto depois de checar `payload.type` (ver `refresh`,
  // `resetPassword`, `verifyEmail`).
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

/** Ver o comentário de `pwv` em `jwt-payload.ts` — fragmento curto, não o hash inteiro (não precisa, só precisa mudar quando a senha muda). */
function computePasswordVersion(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
  };
}
