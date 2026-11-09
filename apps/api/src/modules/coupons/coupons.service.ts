import { BadRequestException, Injectable } from '@nestjs/common';
import type { CouponPreview } from '@asn/types';
import { FirestoreService } from '../firestore/firestore.service';
import {
  calculateCouponDiscountInCents,
  couponDocToRecord,
  validateCoupon,
  type CouponDoc,
} from '../orders/coupon';

@Injectable()
export class CouponsService {
  constructor(private readonly firestore: FirestoreService) {}

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
    const snap = await this.firestore.db.collection('coupons').doc(code.trim().toUpperCase()).get();
    const coupon = snap.exists ? couponDocToRecord(snap.data() as CouponDoc) : null;

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
