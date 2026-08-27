'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUserListItem, UserRole } from '@asn/types';
import { Badge, Text } from '@asn/ui';
import { updateAdminUserRoleAction } from '@/actions/adminUsers';

const ROLE_LABEL: Record<UserRole, string> = {
  CUSTOMER: 'Cliente',
  ADMIN: 'Admin',
  SUPPORT: 'Suporte',
};

const ROLES: UserRole[] = ['CUSTOMER', 'SUPPORT', 'ADMIN'];

/**
 * `currentUserId` desabilita o seletor de papel na própria linha — mesma
 * proteção que a API já aplica (`AdminUsersController.updateRole` rejeita
 * alterar o próprio papel), mas oferecer o controle já desabilitado aqui
 * evita o admin clicar e só então ver o erro voltar do servidor.
 */
export function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserListItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(user: AdminUserListItem, role: UserRole) {
    if (role === user.role) return;
    setError(null);
    setPendingId(user.id);
    try {
      const result = await updateAdminUserRoleAction(user.id, role);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (users.length === 0) {
    return <Text tone="muted">Nenhum cliente encontrado.</Text>;
  }

  return (
    <div>
      {error && (
        <Text size="sm" className="mb-4 text-error" role="alert">
          {error}
        </Text>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted">
              <th className="py-3 pr-4">Nome</th>
              <th className="py-3 pr-4">E-mail</th>
              <th className="py-3 pr-4">Papel</th>
              <th className="py-3 pr-4">E-mail verificado</th>
              <th className="py-3 pr-4">Pedidos</th>
              <th className="py-3 pr-4">Desde</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-ink/5">
                <td className="py-3 pr-4">{user.name}</td>
                <td className="py-3 pr-4 text-ink-muted">{user.email}</td>
                <td className="py-3 pr-4">
                  {user.id === currentUserId ? (
                    <Badge tone="outline">{ROLE_LABEL[user.role]} (você)</Badge>
                  ) : (
                    <select
                      value={user.role}
                      disabled={pendingId === user.id}
                      onChange={(event) => handleRoleChange(user, event.target.value as UserRole)}
                      className="h-9 border border-ink/15 bg-transparent px-2 text-sm text-ink disabled:opacity-50"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <Badge tone={user.emailVerifiedAt ? 'olive' : 'outline'}>
                    {user.emailVerifiedAt ? 'Sim' : 'Não'}
                  </Badge>
                </td>
                <td className="py-3 pr-4">{user.orderCount}</td>
                <td className="py-3 pr-4 text-ink-muted">
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
