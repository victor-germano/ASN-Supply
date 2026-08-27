import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { OrderStatus } from '@asn/types';

const STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUND_REQUESTED',
  'REFUNDED',
];

export class UpdateOrderDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackingUrl?: string | null;
}
