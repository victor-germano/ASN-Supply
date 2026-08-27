/**
 * Promove um usuário existente a `Role.ADMIN` — único jeito de criar o
 * primeiro admin do sistema. De propósito NÃO existe rota de API nem UI
 * pública pra isso: o cadastro público (`POST /auth/register`) sempre cria
 * `CUSTOMER`, e deve continuar assim. Rodar direto no banco (local ou via
 * `DATABASE_URL` de produção apontada na env) é a fronteira de confiança
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
 */
import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Uso: pnpm --filter @asn/api promote-admin -- <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(
      `Nenhum usuário encontrado com o e-mail "${email}". Crie a conta pelo site (/criar-conta) antes de promover.`,
    );
    process.exit(1);
  }

  if (user.role === 'ADMIN') {
    console.log(`"${email}" já é ADMIN — nada a fazer.`);
    return;
  }

  await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
  console.log(`"${email}" agora é ADMIN. Acesse /admin/entrar no site para entrar no painel.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
