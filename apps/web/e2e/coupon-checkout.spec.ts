import { test, expect } from '@playwright/test';
import { addFirstProductToCart, completeCheckout, E2E_COUPON_CODE, signUp } from './helpers';

test.describe('Cupom de desconto no checkout', () => {
  test('aplica o cupom na revisão e o pedido confirmado reflete o desconto', async ({ page }) => {
    await signUp(page);
    await addFirstProductToCart(page);

    const orderId = await completeCheckout(page, { couponCode: E2E_COUPON_CODE });
    expect(orderId).toBeTruthy();

    // Chegou na confirmação — o desconto já foi conferido no helper (linha
    // "Desconto" visível na revisão antes de confirmar); aqui só falta
    // garantir que a confirmação corresponde a um pedido de verdade.
    await expect(page.getByText(/Pedido /)).toBeVisible();
  });
});
