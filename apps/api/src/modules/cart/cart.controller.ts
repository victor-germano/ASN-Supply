import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser, CartItem } from '@asn/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { SetCartItemQuantityDto } from './dto/set-cart-item-quantity.dto';

/**
 * Toda rota exige login — mesmo espírito de `WishlistController`: o
 * carrinho de convidado continua 100% local (`cartStore.ts`); esta API só
 * existe para sincronizar entre dispositivos de quem tem conta (ver
 * `CartSync` no web). `PUT` (não `POST`) em `:variantId` porque a operação
 * é definir a quantidade absoluta, não incrementar — o client já resolveu
 * o delta antes de chamar.
 */
@Controller({ path: 'cart', version: '1' })
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<CartItem[]> {
    return this.service.findAllForUser(user.id);
  }

  @Put('items/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  setItemQuantity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
    @Body() dto: SetCartItemQuantityDto,
  ): Promise<void> {
    return this.service.setItemQuantity(user.id, variantId, dto.quantity);
  }

  @Delete('items/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
  ): Promise<void> {
    return this.service.removeItem(user.id, variantId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clear(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.service.clear(user.id);
  }
}
