'use server';

import { revalidatePath } from 'next/cache';
import type { AdminUserListItem, UserRole } from '@asn/types';
import { ApiError } from '@/services/apiClient';
import { updateAdminUserRole } from '@/services/adminUsers.service';

export type UpdateAdminUserRoleActionResult =
  { success: true; user: AdminUserListItem } | { success: false; message: string };

export async function updateAdminUserRoleAction(
  id: string,
  role: UserRole,
): Promise<UpdateAdminUserRoleActionResult> {
  try {
    const user = await updateAdminUserRole(id, role);
    revalidatePath('/admin/clientes');
    return { success: true, user };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível alterar o papel agora. Tente novamente em instantes.';
    return { success: false, message };
  }
}
