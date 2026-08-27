import { BadRequestException, Injectable } from '@nestjs/common';
import type { CouponPreview } from '@asn/types';
import { PrismaService } from '../prisma/prisma.service';
import { calculateCouponDiscountInCents, validateCoupon } from '../orders/coupon';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Só um preview (não incrementa `redemptionCount`) — usado pelo checkout
   * pra mostrar "cupom aplicado, -R$X" antes de confirmar o pedido de
   * verdade. A aplicação real (que conta como uso) acontece dentro da
   * transação de `OrdersRepository.create`, com as mesmas regras de
   * `validateCoupon`/`calculateCouponDiscountInCents` — reaproveitadas
   * daqui pra não haver duas fontes de verdade sobre o que é um cupom
   * válido.
   */
  async preview(code: string, subtotalInCents: number): Promise<CouponPreview> {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: code.trim().toUpperCase() },
    });
    const error = validateCoupon(coupon, subtotalInCents);
    if (error) {
      throw new BadRequestException(error);
    }
    return {
      code: coupon!.code,
      discountInCents: calculateCouponDiscountInCents(coupon!, subtotalInCents),
    };
  }
}
