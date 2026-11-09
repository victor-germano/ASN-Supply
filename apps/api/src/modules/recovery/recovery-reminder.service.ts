import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { Timestamp } from 'firebase-admin/firestore';
import type { EnvConfig } from '../../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { FirestoreService } from '../firestore/firestore.service';
import { TextMessageSender } from '../messaging/text-message-sender';
import { recoveryReminderSms } from '../messaging/templates';
import { RECOVERY_MAX_AGE_HOURS, decideRecovery, firstNameOf } from './recovery-policy';

interface ProductLookup {
  name: string;
  slug: string;
  isPublished: boolean;
}

interface UserDoc {
  name: string;
  phone: string | null;
  marketingOptIn: boolean;
}

interface ActivityRow {
  type: string;
  createdAt: Date;
  productId: string;
}

interface CandidateContext {
  userId: string;
  name: string;
  phone: string;
  activities: ActivityRow[];
  lastOrderAt: Date | null;
  lastReminderAt: Date | null;
  inCartIds: Set<string>;
}

/** Por rodada — volume de uma loja pequena; o resto fica pra próxima rodada (15 min). */
const BATCH_SIZE = 200;
/** Mesmo teto de antes (`take: 20` nas atividades do usuário). */
const ACTIVITIES_PER_USER = 20;

/**
 * Lembrete "sentimos sua falta" por SMS: cliente LOGADO que autorizou
 * (opt-in no cadastro ou em /conta/preferencias), viu ou escolheu um
 * produto e saiu sem comprar. Todas as regras de quando NÃO mandar ficam
 * em `decideRecovery` (testadas); aqui é só buscar candidatos, escolher o
 * produto a citar e registrar o envio.
 *
 * `User` migrou pro Firestore na Fase 4 (ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md) —
 * `CustomerActivity`/`RecoveryMessage` continuam no Postgres (não migram
 * até a Fase 5), então o `findMany` com `include` encadeado de antes
 * (User → activities/orders/recoveryMessages/cart, tudo numa query só) não
 * é mais possível: usuário e atividade vivem em bancos diferentes agora.
 * A consulta inverte de direção — começa pela atividade recente (ainda no
 * Postgres, com o filtro de tempo), resolve os usuários distintos, e só
 * então busca o resto (Firestore: usuário, pedidos, carrinho) por usuário.
 *
 * Roda dentro da própria API (uma instância). Se um dia houver várias
 * instâncias, isto precisa de um lock (ex: Redis) pra não enviar em dobro.
 */
@Injectable()
export class RecoveryReminderService {
  private readonly logger = new Logger(RecoveryReminderService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly firestore: FirestoreService,
    private readonly sender: TextMessageSender,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  @Cron('*/15 * * * *', { name: 'recovery-reminders', timeZone: 'America/Sao_Paulo' })
  async runScheduled(): Promise<void> {
    if (!this.config.get('RECOVERY_REMINDERS_ENABLED', { infer: true })) return;
    if (this.running) return;
    this.running = true;
    try {
      const sent = await this.run(new Date());
      if (sent > 0) this.logger.log(`${sent} lembrete(s) "sentimos sua falta" enviado(s).`);
    } catch (error) {
      this.logger.error(`Falha na rodada de lembretes: ${error}`);
    } finally {
      this.running = false;
    }
  }

  /** Devolve quantos lembretes foram enviados. Público para teste/disparo manual. */
  async run(now: Date): Promise<number> {
    const delayMinutes = this.config.get('RECOVERY_REMINDER_DELAY_MINUTES', { infer: true });
    const since = new Date(now.getTime() - RECOVERY_MAX_AGE_HOURS * 3_600_000);

    // Usuários distintos com atividade recente — mais recentes primeiro,
    // até o teto da rodada (aproximação do antigo "até 200 usuários": agora
    // é "até 200 usuários distintos entre os mais recentemente ativos").
    const recentActivity = await this.prisma.customerActivity.findMany({
      where: { createdAt: { gte: since } },
      distinct: ['userId'],
      orderBy: { createdAt: 'desc' },
      take: BATCH_SIZE,
      select: { userId: true },
    });
    if (recentActivity.length === 0) return 0;

    const candidates = await this.resolveCandidates(
      recentActivity.map((a) => a.userId),
      since,
    );
    if (candidates.length === 0) return 0;

    const productIds = new Set(candidates.flatMap((c) => c.activities.map((a) => a.productId)));
    const productById = await this.resolveProducts(productIds);

    let sent = 0;
    for (const candidate of candidates) {
      const lastActivity = candidate.activities[0];
      if (!lastActivity) continue;

      const decision = decideRecovery(
        {
          marketingOptIn: true,
          phone: candidate.phone,
          lastActivityAt: lastActivity.createdAt,
          lastOrderAt: candidate.lastOrderAt,
          lastReminderAt: candidate.lastReminderAt,
        },
        now,
        delayMinutes,
      );
      if (!decision.send) continue;

      // Prioridade: o que continua NO CARRINHO (intenção mais forte); senão,
      // o último produto visto. Nunca cita produto despublicado.
      const published = candidate.activities.filter(
        (activity) => productById.get(activity.productId)?.isPublished,
      );
      const fromCart = published.find(
        (activity) => activity.type === 'CART_ADD' && candidate.inCartIds.has(activity.productId),
      );
      const chosenActivity = fromCart ?? published[0];
      if (!chosenActivity) continue;
      const chosenProduct = productById.get(chosenActivity.productId);
      if (!chosenProduct) continue;

      const webAppUrl = this.config.get('WEB_APP_URL', { infer: true });
      const body = recoveryReminderSms({
        firstName: firstNameOf(candidate.name),
        productName: chosenProduct.name,
        inCart: Boolean(fromCart),
        link: fromCart ? `${webAppUrl}/carrinho` : `${webAppUrl}/produtos/${chosenProduct.slug}`,
        optOutLink: `${webAppUrl}/conta/preferencias`,
      });

      try {
        await this.sender.send({ to: candidate.phone, body });
        await this.prisma.recoveryMessage.create({
          data: { userId: candidate.userId, productName: chosenProduct.name, body },
        });
        sent++;
      } catch (error) {
        // Falhou o envio: sem registro, a próxima rodada tenta de novo.
        this.logger.error(`Lembrete não enviado (usuário ${candidate.userId}): ${error}`);
      }
    }
    return sent;
  }

  /**
   * Resolve, por usuário distinto com atividade recente: dados do usuário
   * (Firestore — filtra opt-in/celular), as próprias atividades (Postgres),
   * o último pedido (Firestore, pra `decideRecovery` não insistir em quem
   * já comprou) e o carrinho atual (Firestore, pra priorizar o que ficou
   * dentro dele). Descarta quem não tem opt-in ou celular antes de buscar
   * o resto — a maioria dos custos de leitura só vale a pena pra quem
   * sobrevive esse primeiro filtro.
   */
  private async resolveCandidates(userIds: string[], since: Date): Promise<CandidateContext[]> {
    const userDocs = await this.firestore.db.getAll(
      ...userIds.map((id) => this.firestore.db.collection('users').doc(id)),
    );
    const eligibleIds = userDocs
      .filter((doc) => {
        if (!doc.exists) return false;
        const data = doc.data() as UserDoc;
        return data.marketingOptIn && !!data.phone;
      })
      .map((doc) => doc.id);
    if (eligibleIds.length === 0) return [];

    const userById = new Map(
      userDocs
        .filter((doc) => eligibleIds.includes(doc.id))
        .map((doc) => [doc.id, doc.data() as UserDoc] as const),
    );

    const [activitiesByUser, lastReminderByUser] = await Promise.all([
      this.prisma.customerActivity.findMany({
        where: { userId: { in: eligibleIds }, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        select: { userId: true, type: true, createdAt: true, productId: true },
      }),
      this.prisma.recoveryMessage.findMany({
        where: { userId: { in: eligibleIds } },
        orderBy: { sentAt: 'desc' },
        distinct: ['userId'],
        select: { userId: true, sentAt: true },
      }),
    ]);

    const lastReminderByUserId = new Map(
      lastReminderByUser.map((row) => [row.userId, row.sentAt] as const),
    );

    return Promise.all(
      eligibleIds.map(async (userId) => {
        const activities = activitiesByUser
          .filter((row) => row.userId === userId)
          .slice(0, ACTIVITIES_PER_USER);
        const [lastOrderAt, inCartIds] = await Promise.all([
          this.lastOrderAt(userId),
          this.cartProductIds(userId),
        ]);
        return {
          userId,
          name: userById.get(userId)!.name,
          phone: userById.get(userId)!.phone!,
          activities,
          lastOrderAt,
          lastReminderAt: lastReminderByUserId.get(userId) ?? null,
          inCartIds,
        } satisfies CandidateContext;
      }),
    );
  }

  private async lastOrderAt(userId: string): Promise<Date | null> {
    const snapshot = await this.firestore.db
      .collection('orders')
      .where('userId', '==', userId)
      .get();
    if (snapshot.empty) return null;
    const latest = Math.max(
      ...snapshot.docs.map((doc) => (doc.data().createdAt as Timestamp).toMillis()),
    );
    return new Date(latest);
  }

  private async cartProductIds(userId: string): Promise<Set<string>> {
    const snapshot = await this.firestore.db
      .collection('carts')
      .doc(userId)
      .collection('items')
      .get();
    return new Set(snapshot.docs.map((doc) => (doc.data() as { productSlug: string }).productSlug));
  }

  private async resolveProducts(ids: Set<string>): Promise<Map<string, ProductLookup>> {
    const map = new Map<string, ProductLookup>();
    if (ids.size === 0) return map;
    const docs = await Promise.all(
      Array.from(ids).map((id) => this.firestore.db.collection('products').doc(id).get()),
    );
    for (const doc of docs) {
      if (!doc.exists) continue;
      // Sem `slug` no documento — o id já É o slug (ver `AdminProductsRepository`).
      const data = doc.data() as { name: string; isPublished: boolean };
      map.set(doc.id, { name: data.name, slug: doc.id, isPublished: data.isPublished });
    }
    return map;
  }
}
