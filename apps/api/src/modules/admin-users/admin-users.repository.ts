import { Injectable, NotFoundException } from '@nestjs/common';
import type { AdminUserListItem, PaginatedResult, UserRole } from '@asn/types';
import { Prisma } from '../../../generated/client';
import { PrismaService } from '../prisma/prisma.service';

const listInclude = {
  _count: { select: { orders: true } },
} satisfies Prisma.UserInclude;

type UserWithOrderCount = Prisma.UserGetPayload<{ include: typeof listInclude }>;

function toAdminUserListItem(user: UserWithOrderCount): AdminUserListItem {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    orderCount: user._count.orders,
  };
}

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PaginatedResult<AdminUserListItem>> {
    const where: Prisma.UserWhereInput = params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: 'insensitive' } },
            { email: { contains: params.q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [totalItems, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: listInclude,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    return {
      items: users.map(toAdminUserListItem),
      page: params.page,
      pageSize: params.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / params.pageSize)),
    };
  }

  async updateRole(id: string, role: UserRole): Promise<AdminUserListItem> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { role },
        include: listInclude,
      });
      return toAdminUserListItem(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException({
          errorCode: 'USER_NOT_FOUND',
          message: 'Cliente não encontrado.',
        });
      }
      throw error;
    }
  }
}
