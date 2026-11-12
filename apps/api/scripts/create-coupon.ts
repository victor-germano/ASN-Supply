/**
 * Cria um cupom de desconto. Sem painel admin com CRUD ainda (Módulo 6),
 * esta é a única forma de cadastrar um cupom até lá.
 *
 * Uso (de dentro de apps/api) — um dos dois, nunca os dois:
 *   pnpm exec tsx scripts/create-coupon.ts --code BEMVINDO10 --percent 10
 *   pnpm exec tsx scripts/create-coupon.ts --code FRETE20 --amount 2000
 *
 * Opcionais: --min-order <centavos> --max-redemptions <n> --expires-in-days <n>
 *
 * Coupon migrou pro Firestore na Fase 3 (ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md) — doc em
 * `coupons/{codeNormalizado}` (ver `CouponDoc` em `src/modules/orders/coupon.ts`).
 */
import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from '../src/config/firebase-admin';
import type { CouponDoc } from '../src/modules/orders/coupon';

const db = getDb();

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const code = readArg('code')?.trim().toUpperCase();
  const percentRaw = readArg('percent');
  const amountRaw = readArg('amount');
  const minOrderRaw = readArg('min-order');
  const maxRedemptionsRaw = readArg('max-redemptions');
  const expiresInDaysRaw = readArg('expires-in-days');

  if (!code) {
    console.error('Faltando --code. Ver o comentário no topo do arquivo para o uso completo.');
    process.exit(1);
  }
  if ((!percentRaw && !amountRaw) || (percentRaw && amountRaw)) {
    console.error('Informe exatamente um dos dois: --percent <0-100> OU --amount <centavos>.');
    process.exit(1);
  }

  const ref = db.collection('coupons').doc(code);
  const existing = await ref.get();
  if (existing.exists) {
    console.error(`Já existe um cupom com o código "${code}".`);
    process.exit(1);
  }

  const expiresAt = expiresInDaysRaw
    ? Timestamp.fromMillis(Date.now() + Number(expiresInDaysRaw) * 24 * 60 * 60 * 1000)
    : null;

  const doc: CouponDoc = {
    code,
    percentageOff: percentRaw ? Number(percentRaw) : null,
    amountOffInCents: amountRaw ? Number(amountRaw) : null,
    minOrderInCents: minOrderRaw ? Number(minOrderRaw) : null,
    maxRedemptions: maxRedemptionsRaw ? Number(maxRedemptionsRaw) : null,
    redemptionCount: 0,
    expiresAt,
    isActive: true,
  };
  await ref.set(doc);

  console.log(`Cupom "${code}" criado.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(process.exitCode ?? 0));
