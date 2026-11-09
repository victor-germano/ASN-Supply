/**
 * Cria a conta ADMIN de uma pessoa (ou promove, se a conta já existe) —
 * pensado para a conta da proprietária, que não passa pelo cadastro do
 * site. Gera uma senha temporária forte, mostrada UMA vez no terminal;
 * depois ela troca pelo "Esqueci minha senha" em /admin/entrar.
 *
 * Uso, de dentro de apps/api:
 *   pnpm exec tsx scripts/create-admin.ts email@exemplo.com "Nome exibido"
 *
 * Nenhum dado pessoal fica neste arquivo — e-mail e nome vêm na linha de
 * comando. Mesma fronteira de confiança de `promote-to-admin.ts`: só quem
 * tem acesso ao Firestore de produção (ou ao `.env` local) cria
 * administradores.
 *
 * `User` migrou pro Firestore na Fase 4 (ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md) — mesma
 * coleção `users` + trava `userEmails` que `UsersRepository.create` usa.
 */
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from '../src/config/firebase-admin';

const BCRYPT_ROUNDS = 12;
const db = getDb();

/** 16 caracteres sem ambiguidade (sem 0/O, 1/l/I) — fácil de digitar uma vez. */
function temporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(16);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const name = process.argv[3]?.trim() || 'Administração ASN Supply';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error('Uso: pnpm exec tsx scripts/create-admin.ts <email> ["Nome exibido"]');
    process.exit(1);
  }

  const emailLockRef = db.collection('userEmails').doc(email);
  const existingLock = await emailLockRef.get();
  if (existingLock.exists) {
    const userId = (existingLock.data() as { userId: string }).userId;
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const role = (userSnap.data() as { role: string } | undefined)?.role;
    if (role === 'ADMIN') {
      console.log(`"${email}" já é ADMIN — nada a fazer.`);
      return;
    }
    await userRef.update({ role: 'ADMIN' });
    console.log(`"${email}" promovida a ADMIN (senha atual mantida).`);
    return;
  }

  const password = temporaryPassword();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const userRef = db.collection('users').doc();
  const now = Timestamp.now();
  await db.runTransaction(async (tx) => {
    tx.set(emailLockRef, { userId: userRef.id });
    tx.set(userRef, {
      name,
      email,
      passwordHash,
      role: 'ADMIN',
      avatarUrl: null,
      googleId: null,
      appleId: null,
      emailVerifiedAt: null,
      phone: null,
      marketingOptIn: false,
      marketingOptInAt: null,
      termsAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  });
  console.log(`Conta ADMIN criada para "${email}".`);
  console.log(`Senha temporária (aparece só agora): ${password}`);
  console.log(
    'Troque pelo "Esqueci minha senha" em /admin/entrar assim que o e-mail da loja estiver enviando.',
  );
}

main().catch((error: unknown) => {
  console.error('Falha ao criar admin:', error);
  process.exitCode = 1;
});
