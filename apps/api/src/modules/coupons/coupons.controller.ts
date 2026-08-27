import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CouponPreview } from '@asn/types';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Controller({ path: 'coupons', version: '1' })
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  /** Público (sem login) — mesmo espírito guest-friendly do resto do checkout; só um preview, não gasta o cupom. */
  @Post('validate')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  validate(@Body() dto: ValidateCouponDto): Promise<CouponPreview> {
    return this.service.preview(dto.code, dto.subtotalInCents);
  }
}
