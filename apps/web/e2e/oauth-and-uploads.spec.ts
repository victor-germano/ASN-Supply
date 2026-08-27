import path from 'node:path';
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

/**
 * Login com Google e upload de imagem (Cloudinary) seguem o mesmo padrão
 * porta/adapter do resto do projeto — sem as credenciais configuradas
 * (nunca setadas no job `e2e` do CI, de propósito), o comportamento
 * esperado é "indisponível com clareza", nunca um erro solto ou um botão
 * que promete algo que não funciona. Testar o fluxo real exigiria
 * credenciais de verdade do Google/Cloudinary, fora de escopo do CI.
 */
test.describe('Login com Google e upload de imagem — estado sem credenciais', () => {
  test('botão "Continuar com Google" não aparece sem NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED', async ({
    page,
  }) => {
    await page.goto('/entrar');
    await expect(page.getByRole('link', { name: /continuar com google/i })).toHaveCount(0);
  });

  test('upload de imagem sem CLOUDINARY_URL falha com mensagem clara, campo de URL continua usável', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/catalogo');
    await page.getByRole('button', { name: 'Adicionar marca' }).click();

    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(__dirname, '../public/seed-art/art-01.svg'));

    await expect(
      page.getByText('Upload de imagem ainda não está configurado — cole uma URL diretamente.'),
    ).toBeVisible();

    // O campo de URL continua funcionando normalmente — o upload nunca é o
    // único jeito de preencher a imagem (ver comentário em `ImageUploadField`).
    await page.getByLabel('Logo').fill('https://exemplo.com/logo.png');
    await expect(page.getByLabel('Logo')).toHaveValue('https://exemplo.com/logo.png');
  });
});
