import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@asn/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';

/**
 * Toda rota exige login — o carrinho/favoritos de convidado continuam
 * 100% em localStorage do lado do cliente (`wishlistStore.ts`); esta API
 * só existe para sincronizar entre dispositivos de quem tem conta (ver
 * `WishlistSync` no web). Retorna só os IDs, não os produtos inteiros — o
 * client já sabe buscar o resto via `/products/by-ids`.
 */
@Controller({ path: 'wishlist', version: '1' })
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<string[]> {
    return this.service.findAllForUser(user.id);
  }

  @Post(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ): Promise<void> {
    return this.service.add(user.id, productId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ): Promise<void> {
    return this.service.remove(user.id, productId);
  }
}
