import { test, expect } from '@playwright/test';

test.describe('Página do Produto', () => {
  test('abre a partir da listagem e mostra ação de compra', async ({ page }) => {
    await page.goto('/produtos');
    const firstProductLink = page.locator('a[href^="/produtos/"]').first();
    await firstProductLink.click();
    await expect(page).toHaveURL(/\/produtos\/[^/]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /adicionar ao carrinho/i })).toBeVisible();
  });

  test('favoritar sem estar logado funciona (localStorage, guest)', async ({ page }) => {
    await page.goto('/produtos');
    await page.locator('a[href^="/produtos/"]').first().click();
    await page.getByRole('button', { name: 'Adicionar aos favoritos' }).click();
    await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible();
    // Badge de contagem no header confirma que persistiu na store, não só
    // um toggle visual solto no botão da PDP (sempre "itens" no plural,
    // mesmo pra 1 — mesmo texto real de `WishlistButton`).
    await expect(page.getByRole('link', { name: /favoritos, 1 itens/i })).toBeVisible();
  });
});
