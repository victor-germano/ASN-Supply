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

  test('upload de imagem sem CLOUDINARY_URL guarda no banco da loja e a imagem fica acessível', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/catalogo');
    await page.getByRole('button', { name: 'Adicionar marca' }).click();

    await page.locator('input[type="file"]').setInputFiles({
      // PNG 1x1 — SVG é recusado de propósito pelo upload (pode conter script).
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      ),
    });

    // Sem Cloudinary a imagem vai para o banco e a API devolve a URL
    // (`DatabaseImageUploader`) — o mesmo caminho em dev, CI e produção.
    await expect(page.getByLabel('Logo')).toHaveValue(/\/uploads\/[0-9a-f-]{36}\.png$/);
    const served = await page.request.get(await page.getByLabel('Logo').inputValue());
    expect(served.status()).toBe(200);
    expect(served.headers()['content-type']).toBe('image/png');

    // O campo de URL continua funcionando normalmente — o upload nunca é o
    // único jeito de preencher a imagem (ver comentário em `ImageUploadField`).
    await page.getByLabel('Logo').fill('https://exemplo.com/logo.png');
    await expect(page.getByLabel('Logo')).toHaveValue('https://exemplo.com/logo.png');
  });
});
