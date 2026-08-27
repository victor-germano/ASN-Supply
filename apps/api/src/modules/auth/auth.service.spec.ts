import { describe, expect, it, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import type { EnvConfig } from '../../config/env.validation';
import type { User } from '../../../generated/client';
import { AuthService } from './auth.service';
import type { UsersRepository } from '../users/users.repository';
import type { EmailSender } from '../email/email-sender';

const JWT_SECRET = 'a-test-secret-with-at-least-32-characters';

function fakeConfig(): ConfigService<EnvConfig, true> {
  const values: Record<string, string> = {
    JWT_SECRET,
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '30d',
    WEB_APP_URL: 'http://localhost:3000',
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService<EnvConfig, true>;
}

function fakeEmailSender(): EmailSender {
  return { send: vi.fn().mockResolvedValue(undefined) } as unknown as EmailSender;
}

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user_1',
    name: 'Camila Rocha',
    email: 'camila@example.com',
    passwordHash: null,
    role: 'CUSTOMER',
    avatarUrl: null,
    googleId: null,
    appleId: null,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function buildService(usersRepository: Partial<UsersRepository>) {
  const jwtService = new JwtService({ secret: JWT_SECRET });
  return new AuthService(
    usersRepository as UsersRepository,
    jwtService,
    fakeConfig(),
    fakeEmailSender(),
  );
}

describe('AuthService', () => {
  describe('register', () => {
    it('cria o usuário e devolve um par de tokens quando o e-mail está livre', async () => {
      const created = fakeUser();
      const create = vi.fn().mockResolvedValue(created);
      const service = buildService({ findByEmail: vi.fn().mockResolvedValue(null), create });

      const result = await service.register({
        name: 'Camila Rocha',
        email: 'camila@example.com',
        password: 'senha-forte-123',
      });

      expect(result.user).toEqual({
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        avatarUrl: created.avatarUrl,
        emailVerifiedAt: null,
      });
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Camila Rocha', email: 'camila@example.com' }),
      );
      // Senha nunca guardada em texto puro — só o hash chega no repositório.
      const passedHash = create.mock.calls[0]![0].passwordHash as string;
      expect(passedHash).not.toBe('senha-forte-123');
      expect(await bcrypt.compare('senha-forte-123', passedHash)).toBe(true);
    });

    it('rejeita quando o e-mail já está cadastrado', async () => {
      const service = buildService({ findByEmail: vi.fn().mockResolvedValue(fakeUser()) });

      await expect(
        service.register({
          name: 'Outro',
          email: 'camila@example.com',
          password: 'senha-forte-123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('autentica com a senha correta', async () => {
      const passwordHash = await bcrypt.hash('senha-correta', 12);
      const user = fakeUser({ passwordHash });
      const service = buildService({ findByEmail: vi.fn().mockResolvedValue(user) });

      const result = await service.login({ email: user.email, password: 'senha-correta' });

      expect(result.user.id).toBe(user.id);
      expect(result.accessToken).toBeTruthy();
    });

    it('rejeita senha incorreta', async () => {
      const passwordHash = await bcrypt.hash('senha-correta', 12);
      const service = buildService({
        findByEmail: vi.fn().mockResolvedValue(fakeUser({ passwordHash })),
      });

      await expect(
        service.login({ email: 'camila@example.com', password: 'senha-errada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita e-mail não cadastrado com a mesma mensagem de senha incorreta (não revela qual falhou)', async () => {
      const service = buildService({ findByEmail: vi.fn().mockResolvedValue(null) });

      await expect(
        service.login({ email: 'ninguem@example.com', password: 'qualquer' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita usuário sem senha (cadastrado só via Google — sem senha própria pra comparar)', async () => {
      const service = buildService({
        findByEmail: vi.fn().mockResolvedValue(fakeUser({ passwordHash: null })),
      });

      await expect(
        service.login({ email: 'camila@example.com', password: 'qualquer' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('loginWithGoogle', () => {
    const profile = {
      googleId: 'google-123',
      email: 'camila@example.com',
      name: 'Camila Rocha',
      avatarUrl: 'https://example.com/avatar.png',
    };

    it('acha direto pelo googleId quando já logou com Google antes', async () => {
      const user = fakeUser({ googleId: profile.googleId });
      const findByEmail = vi.fn();
      const service = buildService({
        findByGoogleId: vi.fn().mockResolvedValue(user),
        findByEmail,
      });

      const result = await service.loginWithGoogle(profile);

      expect(result.user.id).toBe(user.id);
      expect(findByEmail).not.toHaveBeenCalled();
    });

    it('associa a conta existente (mesmo e-mail, cadastrada com senha) em vez de criar duplicata', async () => {
      const existing = fakeUser({ googleId: null, passwordHash: 'hash-qualquer' });
      const linked = fakeUser({ googleId: profile.googleId, emailVerifiedAt: new Date() });
      const linkGoogleAccount = vi.fn().mockResolvedValue(linked);
      const createFromGoogle = vi.fn();
      const service = buildService({
        findByGoogleId: vi.fn().mockResolvedValue(null),
        findByEmail: vi.fn().mockResolvedValue(existing),
        linkGoogleAccount,
        createFromGoogle,
      });

      const result = await service.loginWithGoogle(profile);

      expect(linkGoogleAccount).toHaveBeenCalledWith(existing.id, profile.googleId);
      expect(createFromGoogle).not.toHaveBeenCalled();
      expect(result.user.id).toBe(linked.id);
    });

    it('cria uma conta nova (sem senha) quando não existe nem por googleId nem por e-mail', async () => {
      const created = fakeUser({
        googleId: profile.googleId,
        passwordHash: null,
        emailVerifiedAt: new Date(),
      });
      const createFromGoogle = vi.fn().mockResolvedValue(created);
      const service = buildService({
        findByGoogleId: vi.fn().mockResolvedValue(null),
        findByEmail: vi.fn().mockResolvedValue(null),
        createFromGoogle,
      });

      const result = await service.loginWithGoogle(profile);

      expect(createFromGoogle).toHaveBeenCalledWith({
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl,
      });
      expect(result.user.id).toBe(created.id);
      expect(result.accessToken).toBeTruthy();
    });
  });

  describe('refresh', () => {
    it('emite um novo par de tokens a partir de um refresh token válido', async () => {
      const user = fakeUser();
      // Gera um refresh token de verdade via register (mais simples que
      // montar o JWT manualmente aqui).
      const registerResult = await buildService({
        findByEmail: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(user),
      }).register({ name: user.name, email: user.email, password: 'senha-forte-123' });

      const service = buildService({ findById: vi.fn().mockResolvedValue(user) });
      const result = await service.refresh(registerResult.refreshToken);

      // Não comparamos com o refreshToken anterior: payload idêntico +
      // `iat` com granularidade de 1s pode gerar o mesmo JWT byte a byte
      // se as duas chamadas caírem no mesmo segundo — não é um bug, é como
      // JWT funciona. O que importa é que o novo token é válido.
      expect(result.user.id).toBe(user.id);
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('rejeita um access token usado como refresh token', async () => {
      const user = fakeUser();
      const registerResult = await buildService({
        findByEmail: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(user),
      }).register({ name: user.name, email: user.email, password: 'senha-forte-123' });

      const service = buildService({ findById: vi.fn().mockResolvedValue(user) });

      await expect(service.refresh(registerResult.accessToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejeita um token malformado', async () => {
      const service = buildService({});

      await expect(service.refresh('token-invalido')).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita quando o usuário do token não existe mais', async () => {
      const user = fakeUser();
      const registerResult = await buildService({
        findByEmail: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(user),
      }).register({ name: user.name, email: user.email, password: 'senha-forte-123' });

      const service = buildService({ findById: vi.fn().mockResolvedValue(null) });

      await expect(service.refresh(registerResult.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
