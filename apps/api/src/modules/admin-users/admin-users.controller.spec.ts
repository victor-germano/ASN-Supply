import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from '@asn/types';
import { AdminUsersController } from './admin-users.controller';
import type { AdminUsersRepository } from './admin-users.repository';

const ADMIN: AuthenticatedUser = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  avatarUrl: null,
  emailVerifiedAt: null,
  phone: null,
  marketingOptIn: false,
};

function buildController(repository: Partial<AdminUsersRepository>) {
  return new AdminUsersController(repository as AdminUsersRepository);
}

describe('AdminUsersController', () => {
  describe('updateRole', () => {
    it('rejeita alterar o próprio papel', () => {
      const updateRole = vi.fn();
      const controller = buildController({ updateRole });

      expect(() => controller.updateRole(ADMIN.id, { role: 'CUSTOMER' }, ADMIN)).toThrow(
        BadRequestException,
      );
      expect(updateRole).not.toHaveBeenCalled();
    });

    it('permite alterar o papel de outro usuário', async () => {
      const updated = { ...ADMIN, id: 'user-2', role: 'ADMIN' as const };
      const updateRole = vi.fn().mockResolvedValue(updated);
      const controller = buildController({ updateRole });

      const result = await controller.updateRole('user-2', { role: 'ADMIN' }, ADMIN);

      expect(updateRole).toHaveBeenCalledWith('user-2', 'ADMIN');
      expect(result).toBe(updated);
    });
  });
});
