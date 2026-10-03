import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { EnvConfig } from '../../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { TextMessageSender } from '../messaging/text-message-sender';
import { recoveryReminderSms } from '../messaging/templates';
import { RECOVERY_MAX_AGE_HOURS, decideRecovery, firstNameOf } from './recovery-policy';

/** Por rodada — volume de uma loja pequena; o resto fica pra próxima rodada (15 min). */
const BATCH_SIZE = 200;

/**
 * Lembrete "sentimos sua falta" por SMS: cliente LOGADO que autorizou
 * (opt-in no cadastro ou em /conta/preferencias), viu ou escolheu um
 * produto e saiu sem comprar. Todas as regras de quando NÃO mandar ficam
 * em `decideRecovery` (testadas); aqui é só buscar candidatos, escolher o
 * produto a citar e registrar o envio.
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

    const candidates = await this.prisma.user.findMany({
      where: {
        marketingOptIn: true,
        phone: { not: null },
        activities: { some: { createdAt: { gte: since } } },
      },
      take: BATCH_SIZE,
      select: {
        id: true,
        name: true,
        phone: true,
        marketingOptIn: true,
        activities: {
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            type: true,
            createdAt: true,
            productId: true,
            product: { select: { name: true, slug: true, isPublished: true } },
          },
        },
        orders: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
        recoveryMessages: { orderBy: { sentAt: 'desc' }, take: 1, select: { sentAt: true } },
        cart: { select: { items: { select: { productId: true } } } },
      },
    });

    let sent = 0;
    for (const user of candidates) {
      const lastActivity = user.activities[0];
      if (!lastActivity) continue;

      const decision = decideRecovery(
        {
          marketingOptIn: user.marketingOptIn,
          phone: user.phone,
          lastActivityAt: lastActivity.createdAt,
          lastOrderAt: user.orders[0]?.createdAt ?? null,
          lastReminderAt: user.recoveryMessages[0]?.sentAt ?? null,
        },
        now,
        delayMinutes,
      );
      if (!decision.send) continue;

      // Prioridade: o que continua NO CARRINHO (intenção mais forte); senão,
      // o último produto visto. Nunca cita produto despublicado.
      const inCartIds = new Set(user.cart?.items.map((item) => item.productId) ?? []);
      const published = user.activities.filter((activity) => activity.product.isPublished);
      const fromCart = published.find(
        (activity) => activity.type === 'CART_ADD' && inCartIds.has(activity.productId),
      );
      const chosen = fromCart ?? published[0];
      if (!chosen) continue;

      const webAppUrl = this.config.get('WEB_APP_URL', { infer: true });
      const body = recoveryReminderSms({
        firstName: firstNameOf(user.name),
        productName: chosen.product.name,
        inCart: Boolean(fromCart),
        link: fromCart ? `${webAppUrl}/carrinho` : `${webAppUrl}/produtos/${chosen.product.slug}`,
        optOutLink: `${webAppUrl}/conta/preferencias`,
      });

      try {
        await this.sender.send({ to: user.phone!, body });
        await this.prisma.recoveryMessage.create({
          data: { userId: user.id, productName: chosen.product.name, body },
        });
        sent++;
      } catch (error) {
        // Falhou o envio: sem registro, a próxima rodada tenta de novo.
        this.logger.error(`Lembrete não enviado (usuário ${user.id}): ${error}`);
      }
    }
    return sent;
  }
}
