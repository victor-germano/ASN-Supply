import { ConflictException, Injectable } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import type { UserRole } from '@asn/types';
import { FirestoreService } from '../firestore/firestore.service';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  /** E.164, já normalizado. */
  phone: string;
  marketingOptIn: boolean;
  address: {
    zipCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

/** Conta criada via Google — sem senha própria; `emailVerifiedAt` já vem preenchido (Google já verificou o e-mail, não faz sentido pedir de novo). */
export interface CreateGoogleUserData {
  name: string;
  email: string;
  googleId: string;
  avatarUrl: string | null;
}

/** Shape público devolvido pelo repositório — substitui o `User` gerado pelo Prisma. */
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  role: UserRole;
  avatarUrl: string | null;
  googleId: string | null;
  appleId: string | null;
  emailVerifiedAt: Date | null;
  phone: string | null;
  marketingOptIn: boolean;
  marketingOptInAt: Date | null;
  termsAcceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserDoc {
  name: string;
  email: string;
  passwordHash: string | null;
  role: UserRole;
  avatarUrl: string | null;
  googleId: string | null;
  appleId: string | null;
  emailVerifiedAt: Timestamp | null;
  phone: string | null;
  marketingOptIn: boolean;
  marketingOptInAt: Timestamp | null;
  termsAcceptedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface AddressDoc {
  label: string;
  recipientName: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
  createdAt: Timestamp;
}

interface EmailLockDoc {
  userId: string;
}

interface GoogleIdLockDoc {
  userId: string;
}

/**
 * Acesso cru ao model `User` (incl. `passwordHash`) — nunca exposto fora da
 * camada de auth. `AuthService`/`JwtStrategy` são os únicos consumidores;
 * mapear para `AuthenticatedUser` (sem o hash) é responsabilidade deles.
 *
 * Migrado pro Firestore na Fase 4 (ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md). `id` do
 * documento continua opaco (auto-gerado, nunca o e-mail) — ele vai dentro do
 * `sub` do JWT, e um e-mail ali seria uma regressão de privacidade. A
 * unicidade de `email`/`googleId` (antes `@unique` no Postgres) passa a ser
 * garantida por coleções de trava (`userEmails`, `userGoogleIds`), escritas
 * atomicamente junto com o documento principal dentro de uma transação —
 * mais forte até que o `P2002` de antes (checado ANTES do create, não
 * capturado depois de uma tentativa que já ia falhar).
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private get users() {
    return this.firestore.db.collection('users');
  }

  private get emailLocks() {
    return this.firestore.db.collection('userEmails');
  }

  private get googleIdLocks() {
    return this.firestore.db.collection('userGoogleIds');
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const lockSnap = await this.emailLocks.doc(normalizeEmail(email)).get();
    if (!lockSnap.exists) return null;
    const { userId } = lockSnap.data() as EmailLockDoc;
    return this.findById(userId);
  }

  async findById(id: string): Promise<UserRecord | null> {
    const snap = await this.users.doc(id).get();
    if (!snap.exists) return null;
    return toUserRecord(snap.id, snap.data() as UserDoc);
  }

  async findByGoogleId(googleId: string): Promise<UserRecord | null> {
    const lockSnap = await this.googleIdLocks.doc(googleId).get();
    if (!lockSnap.exists) return null;
    const { userId } = lockSnap.data() as GoogleIdLockDoc;
    return this.findById(userId);
  }

  /** Conta + endereço principal numa única transação (equivalente ao nested create do Prisma). */
  async create(data: CreateUserData): Promise<UserRecord> {
    const email = normalizeEmail(data.email);
    const name = data.name.trim();
    const now = Timestamp.now();
    const userRef = this.users.doc();
    const emailLockRef = this.emailLocks.doc(email);

    const userDoc: UserDoc = {
      name,
      email,
      passwordHash: data.passwordHash,
      role: 'CUSTOMER',
      avatarUrl: null,
      googleId: null,
      appleId: null,
      emailVerifiedAt: null,
      phone: data.phone,
      marketingOptIn: data.marketingOptIn,
      marketingOptInAt: data.marketingOptIn ? now : null,
      termsAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const addressDoc: AddressDoc = {
      label: 'Principal',
      recipientName: name,
      street: data.address.street.trim(),
      number: data.address.number.trim(),
      complement: data.address.complement?.trim() || null,
      neighborhood: data.address.neighborhood.trim(),
      city: data.address.city.trim(),
      state: data.address.state.trim().toUpperCase(),
      zipCode: formatZipCode(data.address.zipCode),
      isDefault: true,
      createdAt: now,
    };

    await this.firestore.db.runTransaction(async (tx) => {
      const existingLock = await tx.get(emailLockRef);
      if (existingLock.exists) {
        throw new ConflictException({
          errorCode: 'EMAIL_TAKEN',
          message: 'Este e-mail já está cadastrado.',
        });
      }
      tx.set(emailLockRef, { userId: userRef.id } satisfies EmailLockDoc);
      tx.set(userRef, userDoc);
      tx.set(userRef.collection('addresses').doc(), addressDoc);
    });

    return toUserRecord(userRef.id, userDoc);
  }

  setMarketingOptIn(userId: string, optIn: boolean): Promise<UserRecord> {
    const now = Timestamp.now();
    return this.updateAndGet(userId, {
      marketingOptIn: optIn,
      marketingOptInAt: optIn ? now : null,
      updatedAt: now,
    });
  }

  async createFromGoogle(data: CreateGoogleUserData): Promise<UserRecord> {
    const email = normalizeEmail(data.email);
    const now = Timestamp.now();
    const userRef = this.users.doc();
    const emailLockRef = this.emailLocks.doc(email);
    const googleLockRef = this.googleIdLocks.doc(data.googleId);

    const userDoc: UserDoc = {
      name: data.name.trim(),
      email,
      passwordHash: null,
      role: 'CUSTOMER',
      avatarUrl: data.avatarUrl,
      googleId: data.googleId,
      appleId: null,
      emailVerifiedAt: now,
      phone: null,
      marketingOptIn: false,
      marketingOptInAt: null,
      termsAcceptedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.firestore.db.runTransaction(async (tx) => {
      const [existingEmailLock, existingGoogleLock] = await Promise.all([
        tx.get(emailLockRef),
        tx.get(googleLockRef),
      ]);
      if (existingEmailLock.exists || existingGoogleLock.exists) {
        throw new ConflictException({
          errorCode: 'EMAIL_TAKEN',
          message: 'Este e-mail já está cadastrado.',
        });
      }
      tx.set(emailLockRef, { userId: userRef.id } satisfies EmailLockDoc);
      tx.set(googleLockRef, { userId: userRef.id } satisfies GoogleIdLockDoc);
      tx.set(userRef, userDoc);
    });

    return toUserRecord(userRef.id, userDoc);
  }

  /**
   * Conta que já existia com senha (cadastro normal) fazendo login com
   * Google pela primeira vez com o MESMO e-mail — em vez de criar uma
   * segunda conta, associa o `googleId` à conta existente e marca
   * `emailVerifiedAt` (o Google garante que o e-mail é de verdade; se já
   * estivesse verificado, só atualiza a data — idempotente na prática,
   * nunca "desverifica" nada).
   */
  async linkGoogleAccount(id: string, googleId: string): Promise<UserRecord> {
    const googleLockRef = this.googleIdLocks.doc(googleId);
    const now = Timestamp.now();

    await this.firestore.db.runTransaction(async (tx) => {
      const existingLock = await tx.get(googleLockRef);
      if (existingLock.exists) {
        throw new ConflictException({
          errorCode: 'GOOGLE_ACCOUNT_TAKEN',
          message: 'Esta conta do Google já está associada a outro cadastro.',
        });
      }
      tx.set(googleLockRef, { userId: id } satisfies GoogleIdLockDoc);
      tx.update(this.users.doc(id), { googleId, emailVerifiedAt: now, updatedAt: now });
    });

    return (await this.findById(id))!;
  }

  updatePasswordHash(id: string, passwordHash: string): Promise<UserRecord> {
    return this.updateAndGet(id, { passwordHash, updatedAt: Timestamp.now() });
  }

  /** Idempotente de propósito — verificar um e-mail já verificado não é erro, só um no-op. */
  markEmailVerified(id: string): Promise<UserRecord> {
    const now = Timestamp.now();
    return this.updateAndGet(id, { emailVerifiedAt: now, updatedAt: now });
  }

  private async updateAndGet(id: string, data: Partial<UserDoc>): Promise<UserRecord> {
    const ref = this.users.doc(id);
    await ref.update(data);
    const snap = await ref.get();
    return toUserRecord(snap.id, snap.data() as UserDoc);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toUserRecord(id: string, doc: UserDoc): UserRecord {
  return {
    id,
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    role: doc.role,
    avatarUrl: doc.avatarUrl,
    googleId: doc.googleId,
    appleId: doc.appleId,
    emailVerifiedAt: doc.emailVerifiedAt?.toDate() ?? null,
    phone: doc.phone,
    marketingOptIn: doc.marketingOptIn,
    marketingOptInAt: doc.marketingOptInAt?.toDate() ?? null,
    termsAcceptedAt: doc.termsAcceptedAt?.toDate() ?? null,
    createdAt: doc.createdAt.toDate(),
    updatedAt: doc.updatedAt.toDate(),
  };
}

/** `01310100` → `01310-100` — mesmo formato que o resto do sistema guarda. */
function formatZipCode(zipCode: string): string {
  const digits = zipCode.replace(/\D/g, '');
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}
