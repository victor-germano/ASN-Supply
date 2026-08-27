import { test, expect } from '@playwright/test';
import { signUp } from './helpers';

test.describe('Avaliação e pergunta do cliente na PDP', () => {
  test('cliente autenticado envia avaliação e pergunta, e elas aparecem na página', async ({
    page,
  }) => {
    await signUp(page);

    await page.goto('/produtos');
    await page.locator('a[href^="/produtos/"]').first().click();
    await expect(page).toHaveURL(/\/produtos\/[^/]+$/);

    // Avaliação — nota, título e comentário.
    await page.getByRole('radio', { name: '5 estrelas' }).click();
    await page.getByLabel('Título').fill('Ótimo produto');
    await page
      .getByLabel('Comentário')
      .fill('Chegou rápido e o caimento ficou exatamente como esperado.');
    await page.getByRole('button', { name: 'Enviar avaliação' }).click();
    await expect(page.getByText('Sua avaliação foi enviada. Obrigado!')).toBeVisible();
    await expect(page.getByText('Ótimo produto')).toBeVisible();

    // Pergunta — mesmo padrão de conta obrigatória, formulário separado.
    await page.getByLabel('Fazer uma pergunta').fill('Esse modelo serve largo ou justo?');
    await page.getByRole('button', { name: 'Enviar pergunta' }).click();
    await expect(
      page.getByText('Pergunta enviada — assim que respondida, aparece aqui pra todo mundo.'),
    ).toBeVisible();
    await expect(page.getByText('Esse modelo serve largo ou justo?')).toBeVisible();
  });
});
