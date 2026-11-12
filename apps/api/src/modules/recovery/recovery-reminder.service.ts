import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Timestamp } from 'firebase-admin/firestore';
import type { EnvConfig } from '../../config/env.validation';
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

interface ActivityDoc {
  userId: string;
  productId: string;
  type: 'PRODUCT_VIEW' | 'CART_ADD';
  createdAt: Timestamp;
}

interface ActivityRow {
  type: 'PRODUCT_VIEW' | 'CART_ADD';
  createdAt: Date;
  productId: string;
}

interface RecoveryMessageDoc {
  userId: string;
  productName: string;
  body: string;
  sentAt: Timestamp;
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
 * `CustomerActivity`/`RecoveryMessage` migraram pro Firestore na Fase 5
 * (ver C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md) — User
 * já estava lá desde a Fase 4. Com tudo no mesmo banco, o candidato inicial
 * volta a ser uma única consulta (atividade recente, filtro só em
 * `createdAt`, sem igualdade nenhuma — índice de campo único nativo, sem
 * índice composto), e o resto é resolvido por usuário em paralelo.
 *
 * Roda dentro da própria API (uma instância). Se um dia houver várias
 * instâncias, isto precisa de um lock (ex: Redis) pra não enviar em dobro.
 */
@Injectable()
export class RecoveryReminderService {
  private readonly logger = new Logger(RecoveryReminderService.name);
  private running = false;

  constructor(
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

    // Único filtro é `createdAt >= since` — sem igualdade nenhuma junto,
    // então é um range query de campo único (grátis, sem índice composto).
    // Usuários distintos com atividade recente, mais recentes primeiro, até
    // o teto da rodada.
    const recentActivitySnapshot = await this.firestore.db
      .collection('customerActivities')
      .where('createdAt', '>=', Timestamp.fromDate(since))
      .get();
    const recentUserIds = Array.from(
      new Map(
        recentActivitySnapshot.docs
          .map((doc) => doc.data() as ActivityDoc)
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
          .map((activity) => [activity.userId, activity.userId] as const),
      ).values(),
    ).slice(0, BATCH_SIZE);
    if (recentUserIds.length === 0) return 0;

    const candidates = await this.resolveCandidates(recentUserIds, since);
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
        await this.firestore.db.collection('recoveryMessages').add({
          userId: candidate.userId,
          productName: chosenProduct.name,
          body,
          sentAt: Timestamp.now(),
        } satisfies RecoveryMessageDoc);
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
   * (filtra opt-in/celular), as próprias atividades, o último pedido (pra
   * `decideRecovery` não insistir em quem já comprou) e o carrinho atual
   * (pra priorizar o que ficou dentro dele). Descarta quem não tem opt-in
   * ou celular antes de buscar o resto.
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

    return Promise.all(
      eligibleIds.map(async (userId) => {
        const [activities, lastOrderAt, lastReminderAt, inCartIds] = await Promise.all([
          this.userActivities(userId, since),
          this.lastOrderAt(userId),
          this.lastReminderAt(userId),
          this.cartProductIds(userId),
        ]);
        return {
          userId,
          name: userById.get(userId)!.name,
          phone: userById.get(userId)!.phone!,
          activities,
          lastOrderAt,
          lastReminderAt,
          inCartIds,
        } satisfies CandidateContext;
      }),
    );
  }

  /** Igualdade só em `userId` (índice de campo único, grátis) — janela de tempo e limite filtrados/ordenados em memória. */
  private async userActivities(userId: string, since: Date): Promise<ActivityRow[]> {
    const snapshot = await this.firestore.db
      .collection('customerActivities')
      .where('userId', '==', userId)
      .get();
    return snapshot.docs
      .map((doc) => doc.data() as ActivityDoc)
      .filter((activity) => activity.createdAt.toMillis() >= since.getTime())
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
      .slice(0, ACTIVITIES_PER_USER)
      .map((activity) => ({
        type: activity.type,
        createdAt: activity.createdAt.toDate(),
        productId: activity.productId,
      }));
  }

  private async lastReminderAt(userId: string): Promise<Date | null> {
    const snapshot = await this.firestore.db
      .collection('recoveryMessages')
      .where('userId', '==', userId)
      .get();
    if (snapshot.empty) return null;
    const latest = Math.max(
      ...snapshot.docs.map((doc) => (doc.data() as RecoveryMessageDoc).sentAt.toMillis()),
    );
    return new Date(latest);
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
