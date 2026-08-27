import { test, expect } from '@playwright/test';
import { addFirstProductToCart, completeCheckout, loginAsAdmin, signUp } from './helpers';

test.describe('Admin marca pedido como enviado com rastreio', () => {
  test('rastreio preenchido pelo admin aparece na confirmação do cliente', async ({
    page,
    browser,
  }) => {
    await signUp(page);
    await addFirstProductToCart(page);
    const orderId = await completeCheckout(page);

    // Sessão separada pra não perder o login do cliente na página principal
    // — a mesma verificação de posse que protege `GET /orders/:id` exige
    // reabrir como o próprio cliente depois, não como o admin.
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);
    await adminPage.goto(`/admin/pedidos/${orderId}`);

    const trackingCode = `BR${Date.now()}E2E`;
    await adminPage.getByLabel('Status').selectOption('SHIPPED');
    await adminPage.getByLabel('Código de rastreio').fill(trackingCode);
    await adminPage.getByLabel('Link de rastreio').fill('https://rastreio.exemplo.com/track');
    await adminPage.getByRole('button', { name: 'Salvar' }).click();
    await expect(adminPage.getByLabel('Status')).toHaveValue('SHIPPED');
    await adminContext.close();

    // De volta como o cliente: revisita a própria confirmação e vê o
    // rastreio preenchido pelo admin.
    await page.goto(`/pedido/${orderId}`);
    await expect(page.getByText('Enviado')).toBeVisible();
    await expect(page.getByText(trackingCode)).toBeVisible();
  });
});
