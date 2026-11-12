import { Injectable } from '@nestjs/common';
import type { Timestamp } from 'firebase-admin/firestore';
import type { AdminDashboardStats, OrderStatus } from '@asn/types';
import { FirestoreService } from '../firestore/firestore.service';
import { toMoney } from '../../common/money.mapper';
import { isRevenueStatus } from './revenue-status';

const RECENT_ORDERS_LIMIT = 5;

interface OrderDoc {
  code: string;
  status: OrderStatus;
  totalInCents: number;
  guestName: string;
  createdAt: Timestamp;
}

/**
 * Tudo aqui (Order, Product, User) já migrou pro Firestore — ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md.
 * `totalCustomers` lia `prisma.user.count` até a Fase 4 — parou de ver
 * clientes novos desde que User foi para o Firestore (mesma categoria de
 * bug já encontrada em `isVerifiedPurchase`/`AdminUsersRepository.orderCount`
 * e no Provador Digital; corrigido junto).
 */
@Injectable()
export class AdminDashboardRepository {
  constructor(private readonly firestore: FirestoreService) {}

  async getStats(): Promise<AdminDashboardStats> {
    const [ordersSnapshot, totalProductsCount, totalCustomersCount] = await Promise.all([
      this.firestore.db.collection('orders').get(),
      this.firestore.db.collection('products').where('isPublished', '==', true).count().get(),
      this.firestore.db.collection('users').where('role', '==', 'CUSTOMER').count().get(),
    ]);
    const totalCustomers = totalCustomersCount.data().count;

    const orders = ordersSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as OrderDoc }));

    const revenue = orders
      .filter((order) => isRevenueStatus(order.data.status))
      .reduce((sum, order) => sum + order.data.totalInCents, 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((order) => order.data.status === 'PENDING_PAYMENT').length;
    const recentOrders = orders
      .sort((a, b) => b.data.createdAt.toMillis() - a.data.createdAt.toMillis())
      .slice(0, RECENT_ORDERS_LIMIT)
      .map((order) => ({
        id: order.id,
        code: order.data.code,
        status: order.data.status,
        total: toMoney(order.data.totalInCents),
        guestName: order.data.guestName,
        createdAt: order.data.createdAt.toDate().toISOString(),
      }));

    return {
      revenue: toMoney(revenue),
      totalOrders,
      pendingOrders,
      totalCustomers,
      totalProducts: totalProductsCount.data().count,
      recentOrders,
    };
  }
}
