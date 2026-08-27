import { Injectable } from '@nestjs/common';
import type { User } from '../../../generated/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

/** Conta criada via Google — sem senha própria; `emailVerifiedAt` já vem preenchido (Google já verificou o e-mail, não faz sentido pedir de novo). */
export interface CreateGoogleUserData {
  name: string;
  email: string;
  googleId: string;
  avatarUrl: string | null;
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

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
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

  createFromGoogle(data: CreateGoogleUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        googleId: data.googleId,
        avatarUrl: data.avatarUrl,
        emailVerifiedAt: new Date(),
      },
    });
  }

  /**
   * Conta que já existia com senha (cadastro normal) fazendo login com
   * Google pela primeira vez com o MESMO e-mail — em vez de criar uma
   * segunda conta, associa o `googleId` à conta existente e marca
   * `emailVerifiedAt` (o Google garante que o e-mail é de verdade; se já
   * estivesse verificado, só atualiza a data — idempotente na prática,
   * nunca "desverifica" nada).
   */
  linkGoogleAccount(id: string, googleId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { googleId, emailVerifiedAt: new Date() },
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
