import { test, expect, type Page } from '@playwright/test';

// Navegador limpo — sem a escolha pré-feita que os outros specs usam.
test.use({ storageState: { cookies: [], origins: [] } });

async function consentCookie(page: Page) {
  const cookie = (await page.context().cookies()).find((c) => c.name === 'asn_consent');
  return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : null;
}

test.describe('Consentimento de cookies', () => {
  test('primeira visita mostra o aviso; rejeitar opcionais grava a escolha e não pergunta de novo', async ({
    page,
  }) => {
    await page.goto('/');
    const banner = page.getByRole('region', { name: 'Aviso de cookies' });
    await expect(banner).toBeVisible();
    // Rejeitar tão acessível quanto aceitar.
    await expect(banner.getByRole('button', { name: 'Aceitar todos' })).toBeVisible();
    await banner.getByRole('button', { name: 'Rejeitar opcionais' }).click();

    await expect(banner).toHaveCount(0);
    expect(await consentCookie(page)).toMatchObject({ version: 1, analytics: false });

    await page.reload();
    await expect(page.getByRole('region', { name: 'Aviso de cookies' })).toHaveCount(0);
  });

  test('personalizar: liga estatísticas, salva, e o rodapé reabre as preferências', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Personalizar' }).click();

    const dialog = page.getByRole('dialog', { name: 'Preferências de cookies' });
    await expect(dialog).toBeVisible();
    // Essenciais sempre ligados e travados.
    await expect(dialog.getByRole('switch', { name: /essenciais/i })).toBeDisabled();
    await dialog.getByRole('switch', { name: /Estatísticas de visita/ }).check();
    await dialog.getByRole('button', { name: 'Salvar preferências' }).click();

    await expect(dialog).toHaveCount(0);
    expect(await consentCookie(page)).toMatchObject({ analytics: true });

    await page
      .getByRole('contentinfo')
      .getByRole('button', { name: 'Preferências de cookies' })
      .click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('switch', { name: /Estatísticas de visita/ })).toBeChecked();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('Política de Cookies lista o que o site guarda', async ({ page }) => {
    await page.goto('/politica-de-cookies');
    await expect(
      page.getByRole('heading', { name: 'Política de Cookies', level: 1 }),
    ).toBeVisible();
    for (const name of ['asn_at', 'asn_rt', 'asn_consent', 'asn-cart']) {
      await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
    }
  });
});
