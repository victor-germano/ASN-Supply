import { test, expect } from '@playwright/test';

test.describe('Comparador de produtos', () => {
  test('seleciona 2 produtos na listagem e compara lado a lado', async ({ page }) => {
    await page.goto('/produtos');

    const toggles = page.getByRole('button', { name: /à comparação$/ });
    await toggles.nth(0).click();
    await toggles.nth(1).click();

    // Barra fixa (`CompareBar`) só aparece com 2+ itens selecionados.
    await expect(page.getByText('Comparar (2):')).toBeVisible();
    await page.getByRole('link', { name: 'Comparar' }).click();

    await expect(page).toHaveURL('/comparar');
    await expect(page.getByRole('heading', { name: 'Comparar produtos' })).toBeVisible();
    await expect(page.getByText('Marca', { exact: true })).toBeVisible();
    await expect(page.getByText('Preço')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remover' }).first()).toBeVisible();
  });
});
