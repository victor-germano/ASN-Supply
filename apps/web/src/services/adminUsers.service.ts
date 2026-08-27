import type { AdminUserListItem, PaginatedResult, UserRole } from '@asn/types';
import { authenticatedFetch } from './authenticatedFetch';

export function getAdminUsers(params: {
  page: number;
  pageSize: number;
  q?: string;
}): Promise<PaginatedResult<AdminUserListItem>> {
  return authenticatedFetch<PaginatedResult<AdminUserListItem>>('/admin/users', {
    searchParams: { page: params.page, pageSize: params.pageSize, q: params.q },
  });
}

export function updateAdminUserRole(id: string, role: UserRole): Promise<AdminUserListItem> {
  return authenticatedFetch<AdminUserListItem>(`/admin/users/${id}/role`, {
    init: { method: 'PATCH', body: JSON.stringify({ role }) },
  });
}
