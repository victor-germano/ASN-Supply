import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser } from '@asn/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { FirestoreService } from '../firestore/firestore.service';
import { TrackActivityDto } from './dto/track-activity.dto';

/** Uma visualização do mesmo produto conta uma vez nesta janela (recarregar a página não gera linha nova). */
const VIEW_DEDUP_MINUTES = 30;

/**
 * Registra o que um cliente LOGADO viu ou pôs no carrinho — insumo do
 * lembrete "sentimos sua falta". Só com sessão (`JwtAuthGuard`): visitante
 * anônimo não é rastreado. Sempre 204, sem revelar nada.
 */
@Controller({ path: 'me/activity', version: '1' })
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firestore: FirestoreService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async track(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TrackActivityDto,
  ): Promise<void> {
    // `productId` é o slug do Firestore — Product saiu do Postgres na Fase 3
    // da migração (ver plano), checagem de existência/publicação vai direto
    // na nova fonte da verdade.
    const snap = await this.firestore.db.collection('products').doc(dto.productId).get();
    if (!snap.exists || !(snap.data() as { isPublished: boolean }).isPublished) return;

    if (dto.type === 'PRODUCT_VIEW') {
      const recent = await this.prisma.customerActivity.findFirst({
        where: {
          userId: user.id,
          productId: dto.productId,
          type: 'PRODUCT_VIEW',
          createdAt: { gte: new Date(Date.now() - VIEW_DEDUP_MINUTES * 60_000) },
        },
        select: { id: true },
      });
      if (recent) return;
    }

    await this.prisma.customerActivity.create({
      data: { userId: user.id, productId: dto.productId, type: dto.type },
    });
  }
}
