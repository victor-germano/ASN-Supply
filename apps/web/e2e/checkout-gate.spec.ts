import { test, expect } from '@playwright/test';

test.describe('Checkout exige login', () => {
  test('adicionar ao carrinho funciona sem login, mas ir pro checkout pede conta', async ({
    page,
  }) => {
    await page.goto('/produtos');
    await page.locator('a[href^="/produtos/"]').first().click();

    // Precisa de tamanho selecionado — pega o primeiro disponível (não
    // riscado/sem estoque).
    const sizeFieldset = page.locator('fieldset', { hasText: 'Tamanho' });
    await sizeFieldset.locator('button:not([disabled])').first().click();
    await page.getByRole('button', { name: 'Adicionar ao Carrinho' }).click();
    await expect(page.getByText('Adicionado ao carrinho.')).toBeVisible();

    // Badge de quantidade no header confirma que persistiu, mesmo sem
    // login. `CartButton` sempre usa "itens" no plural (mesmo pra 1) —
    // combinando com o texto real do componente, não o gramaticalmente
    // "certo".
    await expect(page.getByRole('link', { name: /carrinho, 1 itens/i })).toBeVisible();

    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/entrar\?next=%2Fcheckout/);
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  });
});
