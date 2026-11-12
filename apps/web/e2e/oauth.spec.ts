import { test, expect } from '@playwright/test';

/**
 * Login com Google segue o mesmo padrão porta/adapter do resto do projeto
 * — sem as credenciais configuradas (nunca setadas no job `e2e` do CI, de
 * propósito), o comportamento esperado é "indisponível com clareza", nunca
 * um erro solto ou um botão que promete algo que não funciona. Testar o
 * fluxo real exigiria credenciais de verdade do Google, fora de escopo do CI.
 */
test.describe('Login com Google — estado sem credenciais', () => {
  test('botão "Continuar com Google" não aparece sem NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED', async ({
    page,
  }) => {
    await page.goto('/entrar');
    await expect(page.getByRole('link', { name: /continuar com google/i })).toHaveCount(0);
  });
});
