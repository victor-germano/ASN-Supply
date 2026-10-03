import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
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

  // Vira um link clicável na página do pedido do cliente: só http(s), nunca
  // `javascript:` ou similar.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'Informe o link completo de rastreio, começando com https://' },
  )
  trackingUrl?: string | null;
}
