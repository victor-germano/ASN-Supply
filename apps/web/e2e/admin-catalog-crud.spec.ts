import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('CRUD de marca no painel admin', () => {
  test('admin cria, edita e exclui uma marca em /admin/catalogo', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/catalogo');
    // Aba "Marcas" já vem ativa por padrão — sem clique extra necessário.
    await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();

    const brandName = `Marca E2E ${Date.now()}`;
    await page.getByRole('button', { name: 'Adicionar marca' }).click();
    await page.getByLabel('Nome').fill(brandName);
    await page.getByRole('button', { name: 'Salvar marca' }).click();
    await expect(page.getByText(brandName)).toBeVisible();

    // Edita — reabre o formulário preenchido e muda o nome.
    const row = page.locator('li', { hasText: brandName });
    await row.getByRole('button', { name: 'Editar' }).click();
    const renamed = `${brandName} (editada)`;
    await page.getByLabel('Nome').fill(renamed);
    await page.getByRole('button', { name: 'Salvar marca' }).click();
    await expect(page.getByText(renamed)).toBeVisible();
    await expect(page.getByText(brandName, { exact: true })).toHaveCount(0);

    // Exclui — `window.confirm` precisa ser aceito antes do clique disparar.
    const renamedRow = page.locator('li', { hasText: renamed });
    page.once('dialog', (dialog) => dialog.accept());
    await renamedRow.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByText(renamed)).toHaveCount(0);
  });
});
