import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import type { EnvConfig } from '../../config/env.validation';
import type { User } from '../../../generated/client';
import { AuthService } from './auth.service';
import type { UsersRepository } from '../users/users.repository';
import type { EmailSender } from '../email/email-sender';
import type { TextMessageSender } from '../messaging/text-message-sender';
import type { PasswordResetCodeService } from './password-reset-code.service';
import { LOGIN_MAX_FAILURES, LoginLockout } from './login-lockout';
import type { RegisterInput } from '@asn/types';

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
    phone: null,
    marketingOptIn: false,
    marketingOptInAt: null,
    termsAcceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function fakeTextSender(): TextMessageSender {
  return { send: vi.fn().mockResolvedValue(undefined) } as unknown as TextMessageSender;
}

function fakeResetCodes(
  overrides: Partial<PasswordResetCodeService> = {},
): PasswordResetCodeService {
  return {
    issue: vi.fn().mockResolvedValue('123456'),
    consume: vi.fn().mockResolvedValue('invalid'),
    ...overrides,
  } as unknown as PasswordResetCodeService;
}

function buildService(
  usersRepository: Partial<UsersRepository>,
  emailSender: EmailSender = fakeEmailSender(),
  textSender: TextMessageSender = fakeTextSender(),
  resetCodes: PasswordResetCodeService = fakeResetCodes(),
  loginLockout: LoginLockout = new LoginLockout(),
) {
  const jwtService = new JwtService({ secret: JWT_SECRET });
  return new AuthService(
    usersRepository as UsersRepository,
    jwtService,
    fakeConfig(),
    emailSender,
    textSender,
    resetCodes,
    loginLockout,
  );
}

function signupInput(overrides: Partial<RegisterInput> = {}): RegisterInput {
  return {
    firstName: 'Camila',
    lastName: 'Rocha',
    email: 'camila@example.com',
    phone: '(11) 99888-7766',
    password: 'senha-forte-123',
    address: {
      zipCode: '01310-100',
      street: 'Avenida Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    },
    acceptTerms: true,
    marketingOptIn: false,
    ...overrides,
  };
}

/** Extrai o `?token=` do link que `requestPasswordReset` mandou por e-mail. */
function resetTokenFromEmail(emailSender: EmailSender): string {
  const html = vi.mocked(emailSender.send).mock.calls[0]![0].html;
  return /token=([^"&]+)/.exec(html)![1]!;
}

describe('AuthService', () => {
  describe('register', () => {
    it('cria o usuário e devolve um par de tokens quando o e-mail está livre', async () => {
      const created = fakeUser();
      const create = vi.fn().mockResolvedValue(created);
      const service = buildService({ findByEmail: vi.fn().mockResolvedValue(null), create });

      const result = await service.register(signupInput({ marketingOptIn: true }));

      expect(result.user).toEqual({
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        avatarUrl: created.avatarUrl,
        emailVerifiedAt: null,
        phone: created.phone,
        marketingOptIn: created.marketingOptIn,
      });
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      // Nome + sobrenome viram o nome completo; celular sai normalizado
      // (E.164); endereço e consentimento chegam ao repositório.
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Camila Rocha',
          email: 'camila@example.com',
          phone: '+5511998887766',
          marketingOptIn: true,
          address: expect.objectContaining({ zipCode: '01310-100', number: '1000' }),
        }),
      );
      // Senha nunca guardada em texto puro — só o hash chega no repositório.
      const passedHash = create.mock.calls[0]![0].passwordHash as string;
      expect(passedHash).not.toBe('senha-forte-123');
      expect(await bcrypt.compare('senha-forte-123', passedHash)).toBe(true);
    });

    it('rejeita quando o e-mail já está cadastrado', async () => {
      const service = buildService({ findByEmail: vi.fn().mockResolvedValue(fakeUser()) });

      await expect(service.register(signupInput())).rejects.toThrow(ConflictException);
    });

    it('recusa celular inválido (ex: telefone fixo) antes de criar qualquer coisa', async () => {
      const create = vi.fn();
      const service = buildService({ findByEmail: vi.fn().mockResolvedValue(null), create });

      await expect(service.register(signupInput({ phone: '(11) 3333-4444' }))).rejects.toThrow(
        BadRequestException,
      );
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('esqueci a senha por SMS', () => {
    const withPhone = () =>
      fakeUser({ passwordHash: '$2b$04$abcdefghijklmnopqrstuu', phone: '+5511998887766' });

    it('envia o código de 6 dígitos para o celular cadastrado', async () => {
      const textSender = fakeTextSender();
      const service = buildService(
        { findByEmail: vi.fn().mockResolvedValue(withPhone()) },
        fakeEmailSender(),
        textSender,
      );

      await service.requestPasswordReset('camila@example.com', 'sms');

      expect(textSender.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: '+5511998887766', body: expect.stringContaining('123456') }),
      );
    });

    it('conta sem celular: não envia nada e não revela isso (resposta igual)', async () => {
      const textSender = fakeTextSender();
      const emailSender = fakeEmailSender();
      const service = buildService(
        { findByEmail: vi.fn().mockResolvedValue(fakeUser({ passwordHash: 'x', phone: null })) },
        emailSender,
        textSender,
      );

      await expect(
        service.requestPasswordReset('camila@example.com', 'sms'),
      ).resolves.toBeUndefined();
      expect(textSender.send).not.toHaveBeenCalled();
      expect(emailSender.send).not.toHaveBeenCalled();
    });

    it('teto de SMS por hora atingido: não envia', async () => {
      const textSender = fakeTextSender();
      const service = buildService(
        { findByEmail: vi.fn().mockResolvedValue(withPhone()) },
        fakeEmailSender(),
        textSender,
        fakeResetCodes({ issue: vi.fn().mockResolvedValue(null) }),
      );

      await service.requestPasswordReset('camila@example.com', 'sms');
      expect(textSender.send).not.toHaveBeenCalled();
    });

    it('código certo redefine a senha e abre sessão; código errado é recusado', async () => {
      let current = withPhone();
      const repo: Partial<UsersRepository> = {
        findByEmail: vi.fn(async () => current),
        updatePasswordHash: vi.fn(async (_id: string, passwordHash: string) => {
          current = { ...current, passwordHash };
          return current;
        }),
      };
      const consume = vi.fn().mockResolvedValueOnce('invalid').mockResolvedValueOnce('ok');
      const service = buildService(
        repo,
        fakeEmailSender(),
        fakeTextSender(),
        fakeResetCodes({ consume }),
      );

      await expect(
        service.resetPasswordWithCode('camila@example.com', '000000', 'senha-nova-123'),
      ).rejects.toThrow(UnauthorizedException);

      const result = await service.resetPasswordWithCode(
        'camila@example.com',
        '123456',
        'senha-nova-123',
      );
      expect(result.accessToken).toBeTruthy();
      expect(await bcrypt.compare('senha-nova-123', current.passwordHash!)).toBe(true);
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

    it('conta travada recusa até a senha certa (429), e redefinir a senha destrava', async () => {
      const passwordHash = await bcrypt.hash('senha-correta', 12);
      const user = fakeUser({ passwordHash });
      const lockout = new LoginLockout();
      for (let i = 0; i < LOGIN_MAX_FAILURES; i++) lockout.recordFailure(user.email);
      const service = buildService(
        { findByEmail: vi.fn().mockResolvedValue(user) },
        fakeEmailSender(),
        fakeTextSender(),
        fakeResetCodes(),
        lockout,
      );

      await expect(
        service.login({ email: user.email, password: 'senha-correta' }),
      ).rejects.toMatchObject({ status: 429 });

      lockout.clear(user.email);
      await expect(
        service.login({ email: user.email, password: 'senha-correta' }),
      ).resolves.toMatchObject({ user: { id: user.id } });
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
      }).register(signupInput({ email: user.email }));

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
      }).register(signupInput({ email: user.email }));

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
      }).register(signupInput({ email: user.email }));

      const service = buildService({ findById: vi.fn().mockResolvedValue(null) });

      await expect(service.refresh(registerResult.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('esqueci a senha', () => {
    it('não envia nada (e não falha) quando o e-mail não existe', async () => {
      const emailSender = fakeEmailSender();
      const service = buildService({ findByEmail: vi.fn().mockResolvedValue(null) }, emailSender);

      await expect(service.requestPasswordReset('ninguem@example.com')).resolves.toBeUndefined();
      expect(emailSender.send).not.toHaveBeenCalled();
    });

    it('não envia link para conta só-Google (sem senha própria)', async () => {
      const emailSender = fakeEmailSender();
      const service = buildService(
        { findByEmail: vi.fn().mockResolvedValue(fakeUser({ passwordHash: null })) },
        emailSender,
      );

      await service.requestPasswordReset('camila@example.com');
      expect(emailSender.send).not.toHaveBeenCalled();
    });

    it('redefine a senha com o link do e-mail, avisa o usuário e invalida o link e as sessões antigas', async () => {
      const oldHash = await bcrypt.hash('senha-antiga', 4);
      let current = fakeUser({ passwordHash: oldHash });
      const repo: Partial<UsersRepository> = {
        findByEmail: vi.fn(async () => current),
        findById: vi.fn(async () => current),
        updatePasswordHash: vi.fn(async (_id: string, passwordHash: string) => {
          current = { ...current, passwordHash };
          return current;
        }),
      };

      // Sessão aberta em outro aparelho antes da troca.
      const oldSession = await buildService(repo).login({
        email: current.email,
        password: 'senha-antiga',
      });

      const emailSender = fakeEmailSender();
      const service = buildService(repo, emailSender);
      await service.requestPasswordReset(current.email);
      const token = resetTokenFromEmail(emailSender);
      expect(vi.mocked(emailSender.send).mock.calls[0]![0].to).toBe(current.email);

      const result = await service.resetPassword(token, 'senha-nova-123');

      expect(result.accessToken).toBeTruthy();
      expect(await bcrypt.compare('senha-nova-123', current.passwordHash!)).toBe(true);
      // Aviso de "senha alterada" vai pro mesmo e-mail.
      expect(emailSender.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: current.email,
          subject: expect.stringContaining('alterada'),
        }),
      );
      // Link de uso único.
      await expect(service.resetPassword(token, 'outra-senha-123')).rejects.toThrow(
        UnauthorizedException,
      );
      // Sessão antiga derrubada; a nova continua valendo.
      await expect(service.refresh(oldSession.refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh(result.refreshToken)).resolves.toBeTruthy();
    });

    it('rejeita um token de outro tipo usado como link de redefinição', async () => {
      const user = fakeUser({ passwordHash: await bcrypt.hash('x', 4) });
      const session = await buildService({
        findByEmail: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(user),
      }).register(signupInput({ email: user.email }));
      const service = buildService({ findById: vi.fn().mockResolvedValue(user) });

      await expect(service.resetPassword(session.accessToken, 'nova-senha-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
