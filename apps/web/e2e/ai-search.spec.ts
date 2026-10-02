import { test, expect } from '@playwright/test';

test.describe('Busca por estilo (IA)', () => {
  test('sem ASN_ANTHROPIC_API_KEY em CI, cai no fallback textual e ainda encontra produtos', async ({
    page,
  }) => {
    await page.goto('/produtos');

    // "Nova Court" é o nome de várias variantes de produto no seed —
    // garante um match tanto pela busca por IA (se configurada) quanto
    // pelo fallback textual (`AiSearchService.fallbackSearch`, sem
    // `ASN_ANTHROPIC_API_KEY`) usado neste ambiente de CI.
    await page.getByLabel('Descreva o que você procura').fill('Nova Court');
    await page.getByRole('button', { name: 'Buscar por estilo' }).click();

    // `AiSearchService` nunca deixa a busca "quebrar" mesmo sem a chave
    // configurada — sempre cai pro fallback textual em vez de erro.
    await expect(page.getByText('Nenhum produto combinou com')).toHaveCount(0);
    await expect(
      page.locator('a[href^="/produtos/"]', { hasText: 'Nova Court' }).first(),
    ).toBeVisible();
  });
});
