import { Injectable } from '@nestjs/common';
import type { AdminDashboardStats } from '@asn/types';
import { PrismaService } from '../prisma/prisma.service';
import { toMoney } from '../../common/money.mapper';
import { revenueStatusList } from './revenue-status';

const RECENT_ORDERS_LIMIT = 5;

@Injectable()
export class AdminDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Todas as agregações rodam em paralelo — nenhuma depende do resultado
   * de outra, e cada uma já é uma query enxuta (`count`/`aggregate`/`select`
   * limitado), sem trazer as tabelas inteiras pra somar no Node.
   */
  async getStats(): Promise<AdminDashboardStats> {
    const [revenueResult, totalOrders, pendingOrders, totalCustomers, totalProducts, recent] =
      await Promise.all([
        this.prisma.order.aggregate({
          _sum: { totalInCents: true },
          where: { status: { in: revenueStatusList() } },
        }),
        this.prisma.order.count(),
        this.prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
        this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
        this.prisma.product.count({ where: { isPublished: true } }),
        this.prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          take: RECENT_ORDERS_LIMIT,
          select: {
            id: true,
            code: true,
            status: true,
            totalInCents: true,
            guestName: true,
            createdAt: true,
          },
        }),
      ]);

    return {
      revenue: toMoney(revenueResult._sum.totalInCents ?? 0),
      totalOrders,
      pendingOrders,
      totalCustomers,
      totalProducts,
      recentOrders: recent.map((order) => ({
        id: order.id,
        code: order.code,
        status: order.status,
        total: toMoney(order.totalInCents),
        guestName: order.guestName,
        createdAt: order.createdAt.toISOString(),
      })),
    };
  }
}
