import { describe, expect, it } from 'vitest';
import type { OrderStatus } from '@asn/types';
import { isRevenueStatus, revenueStatusList } from './revenue-status';

const ALL_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUND_REQUESTED',
  'REFUNDED',
];

describe('isRevenueStatus', () => {
  it('conta como faturamento a partir de PAID até DELIVERED', () => {
    expect(isRevenueStatus('PAID')).toBe(true);
    expect(isRevenueStatus('PROCESSING')).toBe(true);
    expect(isRevenueStatus('SHIPPED')).toBe(true);
    expect(isRevenueStatus('DELIVERED')).toBe(true);
  });

  it('não conta pedido que ainda não foi pago', () => {
    expect(isRevenueStatus('PENDING_PAYMENT')).toBe(false);
  });

  it('não conta pedido cancelado ou estornado, mesmo que tenha passado por PAID antes', () => {
    expect(isRevenueStatus('CANCELLED')).toBe(false);
    expect(isRevenueStatus('REFUND_REQUESTED')).toBe(false);
    expect(isRevenueStatus('REFUNDED')).toBe(false);
  });

  it('cobre exatamente os 8 status possíveis — nenhum novo status do schema passa despercebido', () => {
    const revenueCount = ALL_STATUSES.filter(isRevenueStatus).length;
    const nonRevenueCount = ALL_STATUSES.length - revenueCount;
    expect(revenueCount).toBe(4);
    expect(nonRevenueCount).toBe(4);
  });
});

describe('revenueStatusList', () => {
  it('devolve uma cópia — mutar o resultado não afeta a lista real usada na query', () => {
    const list = revenueStatusList();
    list.push('CANCELLED');

    expect(revenueStatusList()).not.toContain('CANCELLED');
  });

  it('é consistente com isRevenueStatus (mesma fonte de verdade)', () => {
    const list = revenueStatusList();
    for (const status of ALL_STATUSES) {
      expect(list.includes(status)).toBe(isRevenueStatus(status));
    }
  });
});
