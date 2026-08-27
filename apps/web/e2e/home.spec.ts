import { test, expect } from '@playwright/test';

test.describe('Home', () => {
  test('carrega com header, logo e navegação', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ASN Supply/);
    // `exact: true`: sem isso, casa também com o link "ASN Supply no
    // Instagram" do rodapé (nome acessível contém "ASN Supply" como
    // substring, e getByRole por padrão não é sensível a maiúsculas nem
    // exige match exato).
    await expect(page.getByRole('link', { name: 'ASN SUPPLY', exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeVisible();
  });

  test('não tem aba de login fixa no menu', async ({ page }) => {
    await page.goto('/');
    // O acesso a conta é só pelo ícone (aria-label "Minha conta"), nunca um
    // link de texto "Entrar" no nav principal — ver decisão de produto
    // registrada em docs/HISTORICO.md.
    const nav = page.getByRole('navigation', { name: 'Menu principal' });
    await expect(nav.getByRole('link', { name: /^entrar$/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Minha conta' })).toBeVisible();
  });
});
