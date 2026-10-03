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
 * tem acesso ao banco cria administradores.
 */
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/client';

const BCRYPT_ROUNDS = 12;
const prisma = new PrismaClient();

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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === 'ADMIN') {
      console.log(`"${email}" já é ADMIN — nada a fazer.`);
      return;
    }
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    console.log(`"${email}" promovida a ADMIN (senha atual mantida).`);
    return;
  }

  const password = temporaryPassword();
  await prisma.user.create({
    data: {
      email,
      name,
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      termsAcceptedAt: new Date(),
    },
  });
  console.log(`Conta ADMIN criada para "${email}".`);
  console.log(`Senha temporária (aparece só agora): ${password}`);
  console.log(
    'Troque pelo "Esqueci minha senha" em /admin/entrar assim que o e-mail da loja estiver enviando.',
  );
}

main()
  .catch((error: unknown) => {
    console.error('Falha ao criar admin:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
