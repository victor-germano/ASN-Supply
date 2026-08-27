import { Injectable } from '@nestjs/common';
import type { User } from '../../../generated/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

/**
 * Acesso cru ao model `User` (incl. `passwordHash`) — nunca exposto fora da
 * camada de auth. `AuthService`/`JwtStrategy` são os únicos consumidores;
 * mapear para `AuthenticatedUser` (sem o hash) é responsabilidade deles.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        passwordHash: data.passwordHash,
      },
    });
  }

  updatePasswordHash(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  /** Idempotente de propósito — verificar um e-mail já verificado não é erro, só um no-op. */
  markEmailVerified(id: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { emailVerifiedAt: new Date() } });
  }
}
