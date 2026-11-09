import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Timestamp, type DocumentReference } from 'firebase-admin/firestore';
import type { EnvConfig } from '../../config/env.validation';
import { FirestoreService } from '../firestore/firestore.service';

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

interface CodeDoc {
  userId: string;
  codeHash: string;
  expiresAt: Timestamp;
  attempts: number;
  usedAt: Timestamp | null;
  createdAt: Timestamp;
}

/**
 * Coleção top-level `passwordResetCodes` (não subcoleção de `users/{id}`) —
 * nada aqui precisa de consulta entre usuários, mas manter como as outras
 * coleções "de segurança" (mesmo nível de `userEmails`/`userGoogleIds`)
 * deixa o caminho curto e direto por `userId` (índice de campo único,
 * grátis). Sem índice composto: `issue`/`consume` leem todos os códigos do
 * usuário (lista naturalmente pequena — no máximo `RESET_CODE_MAX_PER_HOUR`
 * novos por hora, sem limpeza automática dos antigos) e filtram/ordenam o
 * resto em memória, mesmo padrão usado no resto desta migração para evitar
 * índice composto só criável pelo Console.
 */
@Injectable()
export class PasswordResetCodeService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  private get codes() {
    return this.firestore.db.collection('passwordResetCodes');
  }

  /**
   * Gera um código novo (invalidando os anteriores ainda abertos) ou `null`
   * se a conta já atingiu o teto de SMS da última hora.
   */
  async issue(userId: string, now = new Date()): Promise<string | null> {
    const cutoff = Timestamp.fromMillis(now.getTime() - 60 * 60 * 1000);
    const code = generateResetCode();
    const newRef = this.codes.doc();

    const result = await this.firestore.db.runTransaction(async (tx) => {
      const existing = await tx.get(this.codes.where('userId', '==', userId));
      const docs = existing.docs.map((doc) => ({ ref: doc.ref, data: doc.data() as CodeDoc }));

      const sentLastHour = docs.filter(
        (d) => d.data.createdAt.toMillis() >= cutoff.toMillis(),
      ).length;
      if (sentLastHour >= RESET_CODE_MAX_PER_HOUR) return null;

      for (const d of docs) {
        if (d.data.usedAt === null) tx.update(d.ref, { usedAt: Timestamp.fromDate(now) });
      }
      tx.set(newRef, {
        userId,
        codeHash: hashResetCode(this.secret(), userId, code),
        expiresAt: Timestamp.fromMillis(now.getTime() + RESET_CODE_TTL_MINUTES * 60 * 1000),
        attempts: 0,
        usedAt: null,
        createdAt: Timestamp.fromDate(now),
      } satisfies CodeDoc);
      return code;
    });

    return result;
  }

  /**
   * Confere e "queima" o código. Errar conta tentativa; na 5ª o código
   * morre — 1 milhão de combinações não resistem a tentativas ilimitadas.
   */
  async consume(userId: string, code: string, now = new Date()): Promise<ConsumeResult> {
    const snapshot = await this.codes.where('userId', '==', userId).get();
    const candidates = snapshot.docs
      .map((doc) => ({ ref: doc.ref, data: doc.data() as CodeDoc }))
      .filter((d) => d.data.usedAt === null && d.data.expiresAt.toMillis() > now.getTime())
      .sort((a, b) => b.data.createdAt.toMillis() - a.data.createdAt.toMillis());
    const current = candidates[0];
    if (!current || current.data.attempts >= RESET_CODE_MAX_ATTEMPTS) return 'invalid';

    const expected = Buffer.from(current.data.codeHash, 'hex');
    const received = Buffer.from(hashResetCode(this.secret(), userId, code.trim()), 'hex');
    const matches = expected.length === received.length && timingSafeEqual(expected, received);

    if (!matches) {
      await current.ref.update({ attempts: current.data.attempts + 1 });
      return 'invalid';
    }

    // Condicional: duas requisições simultâneas com o código certo não
    // podem as duas redefinir a senha — relê dentro da transação e só
    // "queima" se ainda não tiver sido usado.
    return this.claim(current.ref, now);
  }

  private async claim(ref: DocumentReference, now: Date): Promise<ConsumeResult> {
    return this.firestore.db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      const data = fresh.data() as CodeDoc | undefined;
      if (!data || data.usedAt !== null) return 'invalid';
      tx.update(ref, { usedAt: Timestamp.fromDate(now) });
      return 'ok';
    });
  }

  private secret(): string {
    return this.config.get('JWT_SECRET', { infer: true });
  }
}
