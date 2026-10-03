import { test, expect } from '@playwright/test';
import { loginAsAdmin, signUp } from './helpers';

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
    await signUp(page);

    await page.goto('/admin');
    // Não vai pro /admin/entrar (não "convida" a tentar) — volta pra home.
    await expect(page).toHaveURL('/');
  });

  test('/admin autenticado como ADMIN mostra o painel com dados reais, não o placeholder antigo', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await expect(page.getByText('Faturamento')).toBeVisible();
    await expect(page.getByText('Aguardando pagamento').first()).toBeVisible();
    // O card do painel (não o link "Clientes" do menu, que também existe).
    await expect(page.getByRole('paragraph').filter({ hasText: /^Clientes$/ })).toBeVisible();
    // Texto antigo (Módulo 6, quando `/admin` era só a confirmação de
    // login) não pode voltar a aparecer — o painel de verdade já existe.
    await expect(page.getByText('ainda não foi construído')).toHaveCount(0);
  });
});
