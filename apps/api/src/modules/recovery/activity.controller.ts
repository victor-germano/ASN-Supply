import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Timestamp } from 'firebase-admin/firestore';
import type { AuthenticatedUser } from '@asn/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FirestoreService } from '../firestore/firestore.service';
import { TrackActivityDto } from './dto/track-activity.dto';

/** Uma visualização do mesmo produto conta uma vez nesta janela (recarregar a página não gera linha nova). */
const VIEW_DEDUP_MINUTES = 30;

interface CustomerActivityDoc {
  userId: string;
  productId: string;
  type: 'PRODUCT_VIEW' | 'CART_ADD';
  createdAt: Timestamp;
}

/**
 * Registra o que um cliente LOGADO viu ou pôs no carrinho — insumo do
 * lembrete "sentimos sua falta". Só com sessão (`JwtAuthGuard`): visitante
 * anônimo não é rastreado. Sempre 204, sem revelar nada.
 *
 * `CustomerActivity` migrou pro Firestore na Fase 5 (ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md) — coleção
 * top-level `customerActivities` (não subcoleção de `users/{id}`: o job de
 * recovery varre atividade recente ENTRE usuários, não dentro de um só). A
 * checagem de "visualização recente duplicada" lê só as atividades deste
 * usuário (igualdade em `userId`, índice de campo único, grátis) e filtra
 * produto/tipo/janela de tempo em memória — mesmo padrão do resto da
 * migração, pra evitar índice composto só criável pelo Console.
 */
@Controller({ path: 'me/activity', version: '1' })
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly firestore: FirestoreService) {}

  private get activities() {
    return this.firestore.db.collection('customerActivities');
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async track(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TrackActivityDto,
  ): Promise<void> {
    // `productId` é o slug do Firestore — checagem de existência/publicação
    // vai direto na fonte da verdade do catálogo.
    const snap = await this.firestore.db.collection('products').doc(dto.productId).get();
    if (!snap.exists || !(snap.data() as { isPublished: boolean }).isPublished) return;

    if (dto.type === 'PRODUCT_VIEW') {
      const cutoff = Date.now() - VIEW_DEDUP_MINUTES * 60_000;
      const recentSnapshot = await this.activities.where('userId', '==', user.id).get();
      const hasRecentView = recentSnapshot.docs.some((doc) => {
        const data = doc.data() as CustomerActivityDoc;
        return (
          data.productId === dto.productId &&
          data.type === 'PRODUCT_VIEW' &&
          data.createdAt.toMillis() >= cutoff
        );
      });
      if (hasRecentView) return;
    }

    await this.activities.add({
      userId: user.id,
      productId: dto.productId,
      type: dto.type,
      createdAt: Timestamp.now(),
    } satisfies CustomerActivityDoc);
  }
}
