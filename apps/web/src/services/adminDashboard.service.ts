import type { AdminDashboardStats } from '@asn/types';
import { authenticatedFetch } from './authenticatedFetch';

/** Alimenta `/admin` (Painel) — a primeira tela que um admin vê ao entrar. */
export function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return authenticatedFetch<AdminDashboardStats>('/admin/dashboard');
}
