/**
 * Promove um usuário existente a `Role.ADMIN` — único jeito de criar o
 * primeiro admin do sistema. De propósito NÃO existe rota de API nem UI
 * pública pra isso: o cadastro público (`POST /auth/register`) sempre cria
 * `CUSTOMER`, e deve continuar assim. Rodar direto no Firestore (local ou
 * de produção, pela credencial configurada) é a fronteira de confiança
 * certa para uma ação deste tipo.
 *
 * Uso: crie a conta normalmente pelo site (/criar-conta) primeiro, depois,
 * de dentro de apps/api:
 *   pnpm exec tsx scripts/promote-to-admin.ts seu-email@exemplo.com
 *
 * (`pnpm --filter @asn/api promote-admin -- <email>` também existe como
 * atalho, mas nesta versão do pnpm no Windows o "--" às vezes chega como
 * argumento literal em vez de separador — se acontecer, use o comando
 * acima, que é direto e sempre funciona.)
 *
 * `User` migrou pro Firestore na Fase 4 (ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md) — resolvido
 * pela mesma trava `userEmails` que `UsersRepository.findByEmail` usa.
 */
import { getDb } from '../src/config/firebase-admin';

const db = getDb();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Uso: pnpm --filter @asn/api promote-admin -- <email>');
    process.exit(1);
  }

  const lockSnap = await db.collection('userEmails').doc(email).get();
  if (!lockSnap.exists) {
    console.error(
      `Nenhum usuário encontrado com o e-mail "${email}". Crie a conta pelo site (/criar-conta) antes de promover.`,
    );
    process.exit(1);
  }

  const userId = (lockSnap.data() as { userId: string }).userId;
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const role = (userSnap.data() as { role: string } | undefined)?.role;

  if (role === 'ADMIN') {
    console.log(`"${email}" já é ADMIN — nada a fazer.`);
    return;
  }

  await userRef.update({ role: 'ADMIN' });
  console.log(`"${email}" agora é ADMIN. Acesse /admin/entrar no site para entrar no painel.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
