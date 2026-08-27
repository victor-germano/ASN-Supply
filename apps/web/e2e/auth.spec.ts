import { test, expect } from '@playwright/test';

/** E-mail único por execução — evita colidir com uma conta de uma rodada anterior. */
function uniqueEmail(): string {
  return `e2e.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@asn-e2e.dev`;
}

test.describe('Cadastro, login e logout', () => {
  test('cria conta, é redirecionado autenticado, e desloga', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/criar-conta');
    await page.getByLabel('Nome').fill('Teste E2E');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill('SenhaForte123!');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL(/\/conta\/pedidos/);
    await expect(page.getByRole('heading', { name: 'Meus pedidos' })).toBeVisible();
    // Conta recém-criada nunca confirmou e-mail — banner precisa aparecer.
    await expect(page.getByText('Confirme seu e-mail')).toBeVisible();

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL('/');

    // Sessão realmente encerrada: voltar pra área logada pede login de novo.
    await page.goto('/conta/pedidos');
    await expect(page).toHaveURL(/\/entrar/);
  });

  test('login com credenciais inválidas mostra erro, sem navegar', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill('nao-existe@asn-e2e.dev');
    await page.getByLabel('Senha').fill('SenhaErrada123!');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
    await expect(page).toHaveURL(/\/entrar/);
  });
});
