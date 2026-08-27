import { test, expect } from '@playwright/test';

test.describe('Acesso administrativo', () => {
  test('/admin/entrar é acessível diretamente (rota oculta, não quebrada)', async ({ page }) => {
    await page.goto('/admin/entrar');
    await expect(page.getByRole('heading', { name: 'Administração' })).toBeVisible();
    // Diferente do login de cliente, não oferece "criar conta" aqui.
    await expect(page.getByRole('link', { name: 'Criar conta' })).toHaveCount(0);
  });

  test('/admin sem sessão redireciona pro login administrativo', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/entrar\?next=%2Fadmin/);
  });

  test('cliente comum autenticado é barrado de /admin em silêncio', async ({ page }) => {
    const email = `e2e.customer.${Date.now()}@asn-e2e.dev`;
    await page.goto('/criar-conta');
    await page.getByLabel('Nome').fill('Cliente E2E');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill('SenhaForte123!');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\/conta\/pedidos/);

    await page.goto('/admin');
    // Não vai pro /admin/entrar (não "convida" a tentar) — volta pra home.
    await expect(page).toHaveURL('/');
  });
});
