import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';

export const RESET_CODE_TTL_MINUTES = 10;
export const RESET_CODE_MAX_ATTEMPTS = 5;
/** Teto de SMS por conta — protege o cliente (bombardeio) e a loja (custo por SMS). */
export const RESET_CODE_MAX_PER_HOUR = 3;

/** 6 dígitos com zeros à esquerda — `randomInt` é criptograficamente seguro (não `Math.random`). */
export function generateResetCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * HMAC com o segredo do servidor, não um hash puro: só existem 1 milhão de
 * códigos possíveis, então um SHA-256 simples seria quebrado por força bruta
 * em segundos por quem conseguisse uma cópia do banco. Sem o `JWT_SECRET`,
 * o hash não serve pra nada. `userId` no conteúdo: o mesmo código pra duas
 * contas não gera o mesmo hash.
 */
export function hashResetCode(secret: string, userId: string, code: string): string {
  return createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');
}

export type ConsumeResult = 'ok' | 'invalid';

@Injectable()
export class PasswordResetCodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  /**
   * Gera um código novo (invalidando os anteriores ainda abertos) ou `null`
   * se a conta já atingiu o teto de SMS da última hora.
   */
  async issue(userId: string, now = new Date()): Promise<string | null> {
    const sentLastHour = await this.prisma.passwordResetCode.count({
      where: { userId, createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) } },
    });
    if (sentLastHour >= RESET_CODE_MAX_PER_HOUR) return null;

    const code = generateResetCode();
    await this.prisma.$transaction([
      this.prisma.passwordResetCode.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.passwordResetCode.create({
        data: {
          userId,
          codeHash: hashResetCode(this.secret(), userId, code),
          expiresAt: new Date(now.getTime() + RESET_CODE_TTL_MINUTES * 60 * 1000),
        },
      }),
    ]);
    return code;
  }

  /**
   * Confere e "queima" o código. Errar conta tentativa; na 5ª o código
   * morre — 1 milhão de combinações não resistem a tentativas ilimitadas.
   */
  async consume(userId: string, code: string, now = new Date()): Promise<ConsumeResult> {
    const current = await this.prisma.passwordResetCode.findFirst({
      where: { userId, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!current || current.attempts >= RESET_CODE_MAX_ATTEMPTS) return 'invalid';

    const expected = Buffer.from(current.codeHash, 'hex');
    const received = Buffer.from(hashResetCode(this.secret(), userId, code.trim()), 'hex');
    const matches = expected.length === received.length && timingSafeEqual(expected, received);

    if (!matches) {
      await this.prisma.passwordResetCode.update({
        where: { id: current.id },
        data: { attempts: { increment: 1 } },
      });
      return 'invalid';
    }

    // Condicional: duas requisições simultâneas com o código certo não
    // podem as duas redefinir a senha.
    const claimed = await this.prisma.passwordResetCode.updateMany({
      where: { id: current.id, usedAt: null },
      data: { usedAt: now },
    });
    return claimed.count === 1 ? 'ok' : 'invalid';
  }

  private secret(): string {
    return this.config.get('JWT_SECRET', { infer: true });
  }
}
