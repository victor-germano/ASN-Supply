import { test, expect } from '@playwright/test';

test.describe('Catálogo', () => {
  test('listagem de produtos carrega com itens', async ({ page }) => {
    await page.goto('/produtos');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Qualquer link pra uma PDP (/produtos/algum-slug) confirma que a
    // grade renderizou produtos de verdade, sem acoplar a um nome
    // específico do catálogo seed (que pode mudar).
    const productLinks = page.locator('a[href^="/produtos/"]');
    await expect(productLinks.first()).toBeVisible();
  });

  test('busca pelo header leva à listagem filtrada', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Buscar produtos' }).click();
    await page.getByPlaceholder('Buscar tênis, marca ou estilo...').fill('tenis');
    await page.getByPlaceholder('Buscar tênis, marca ou estilo...').press('Enter');
    await expect(page).toHaveURL(/\/produtos\?q=tenis/);
  });
});
