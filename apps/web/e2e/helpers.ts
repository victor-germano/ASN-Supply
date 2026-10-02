import fs from 'node:fs';
import path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Helpers compartilhados entre specs — nenhum arquivo aqui termina em
 * `.spec.ts`, então o Playwright (`testDir: './e2e'`) nunca os enxerga
 * como testes por conta própria.
 */

/** E-mail único por chamada — evita colidir com uma conta de uma rodada anterior. */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@asn-e2e.dev`;
}

/**
 * Conta admin fixa semeada por `prisma/seed.ts` (`seedE2EFixtures`) — só
 * existe em bancos de desenvolvimento/demonstração (o seed nunca roda em
 * produção), nunca uma credencial de verdade.
 */
export const E2E_ADMIN_EMAIL = 'e2e.admin@example.com';
export const E2E_ADMIN_PASSWORD = 'SenhaAdminE2E123!';

/** Cupom fixo (10% off, sem mínimo/validade) semeado junto com a conta admin. */
export const E2E_COUPON_CODE = 'E2E10';

/** Cria uma conta nova e fica autenticado — mesmo fluxo de `auth.spec.ts`. */
export async function signUp(page: Page, name = 'Cliente E2E'): Promise<string> {
  const email = uniqueEmail();
  await page.goto('/criar-conta');
  await page.getByLabel('Nome').fill(name);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('SenhaForte123!');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/conta\/pedidos/);
  return email;
}

/**
 * Sessão admin salva em disco e reaproveitada entre specs (e entre os
 * workers paralelos). Sem isso, cada spec fazia um login novo e a suíte
 * estourava o limite anti-força-bruta de `POST /auth/login` (5/min por
 * IP) — o limite está certo; quem não deveria logar 6 vezes por minuto
 * eram os testes. `test-results/` já é ignorado pelo git.
 */
const ADMIN_STORAGE_STATE = path.join(__dirname, '..', 'test-results', '.admin-session.json');
const ADMIN_SESSION_MAX_AGE_MS = 10 * 60 * 1000;

/** Login com a conta admin semeada — mesmo `LoginForm` do cliente, só que via `/admin/entrar`. */
export async function loginAsAdmin(page: Page): Promise<void> {
  if (await restoreAdminSession(page)) return;

  await page.goto('/admin/entrar');
  await page.getByLabel('E-mail').fill(E2E_ADMIN_EMAIL);
  await page.getByLabel('Senha').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/admin');

  fs.mkdirSync(path.dirname(ADMIN_STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
}

async function restoreAdminSession(page: Page): Promise<boolean> {
  try {
    const { mtimeMs } = fs.statSync(ADMIN_STORAGE_STATE);
    if (Date.now() - mtimeMs > ADMIN_SESSION_MAX_AGE_MS) return false;
    const state = JSON.parse(fs.readFileSync(ADMIN_STORAGE_STATE, 'utf8')) as {
      cookies: Parameters<BrowserContext['addCookies']>[0];
    };
    await page.context().addCookies(state.cookies);
    await page.goto('/admin');
    // Sessão salva inválida (banco re-semeado, por ex.) cai no login normal.
    return new URL(page.url()).pathname === '/admin';
  } catch {
    return false;
  }
}

/** Abre o primeiro produto da listagem e adiciona 1 unidade ao carrinho (primeiro tamanho disponível). */
export async function addFirstProductToCart(page: Page): Promise<void> {
  await page.goto('/produtos');
  await page.locator('a[href^="/produtos/"]').first().click();
  const sizeFieldset = page.locator('fieldset', { hasText: 'Tamanho' });
  await sizeFieldset.locator('button:not([disabled])').first().click();
  await page.getByRole('button', { name: 'Adicionar ao Carrinho' }).click();
  await expect(page.getByText('Adicionado ao carrinho.')).toBeVisible();
}

export interface CompleteCheckoutOptions {
  couponCode?: string;
}

/**
 * Percorre os 3 passos do checkout (contato/endereço digitado → frete →
 * revisão) e confirma o pedido. Assume uma conta já autenticada com pelo
 * menos 1 item no carrinho (ver `addFirstProductToCart`). Devolve o id do
 * pedido, extraído da URL de confirmação (`/pedido/[id]`).
 */
export async function completeCheckout(
  page: Page,
  options: CompleteCheckoutOptions = {},
): Promise<string> {
  await page.goto('/checkout');

  // Passo 1: contato + endereço digitado (sem endereço salvo ainda).
  await page.getByLabel('Nome completo').fill('Cliente E2E');
  await page.getByLabel('E-mail').fill(uniqueEmail());
  await page.getByLabel('Telefone (com DDD)').fill('11987654321');
  await page.getByLabel('Quem recebe').fill('Cliente E2E');
  await page.getByLabel('CEP').fill('01310-100');
  await page.getByLabel('Rua').fill('Avenida Paulista');
  await page.getByLabel('Número').fill('1000');
  await page.getByLabel('Bairro').fill('Bela Vista');
  await page.getByLabel('Cidade').fill('São Paulo');
  await page.getByLabel('UF').fill('SP');
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Passo 2: frete — mantém a opção padrão já selecionada.
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Passo 3: revisão — cupom (opcional) + confirmação.
  if (options.couponCode) {
    await page.getByPlaceholder('Cupom de desconto').fill(options.couponCode);
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText(`Cupom ${options.couponCode} aplicado`)).toBeVisible();
    // `OrderSummary` só mostra a linha "Desconto" quando `discountInCents >
    // 0` — confirma que o desconto de verdade entrou no total, não só que
    // o código foi aceito.
    await expect(page.getByText('Desconto')).toBeVisible();
  }
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();

  await expect(page).toHaveURL(/\/pedido\/[^/]+$/);
  const url = page.url();
  const orderId = url.split('/pedido/')[1]!.split(/[?#]/)[0]!;
  return orderId;
}
