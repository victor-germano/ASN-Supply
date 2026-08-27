import { describe, expect, it, vi } from 'vitest';
import type { AdminDashboardStats } from '@asn/types';
import { AdminDashboardController } from './admin-dashboard.controller';
import type { AdminDashboardRepository } from './admin-dashboard.repository';

function fakeStats(overrides: Partial<AdminDashboardStats> = {}): AdminDashboardStats {
  return {
    revenue: { amountInCents: 0, currency: 'BRL' },
    totalOrders: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    recentOrders: [],
    ...overrides,
  };
}

describe('AdminDashboardController', () => {
  it('devolve o resultado de repository.getStats() sem transformar', async () => {
    const stats = fakeStats({ totalOrders: 12, pendingOrders: 3 });
    const getStats = vi.fn().mockResolvedValue(stats);
    const controller = new AdminDashboardController({
      getStats,
    } as unknown as AdminDashboardRepository);

    const result = await controller.getStats();

    expect(getStats).toHaveBeenCalledOnce();
    expect(result).toBe(stats);
  });
});
