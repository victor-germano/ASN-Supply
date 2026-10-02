import { test, expect } from '@playwright/test';
import { addFirstProductToCart, completeCheckout, signUp } from './helpers';

test.describe('Cancelamento de pedido pelo cliente', () => {
  test('cliente cancela um pedido recém-criado e o status reflete o cancelamento', async ({
    page,
  }) => {
    await signUp(page);
    await addFirstProductToCart(page);
    await completeCheckout(page);

    // `order.canCancel` é `true` — pedido recém-criado é sempre
    // `PENDING_PAYMENT` e pertence a quem está logado agora.
    await expect(page.getByRole('button', { name: 'Cancelar pedido' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancelar pedido' }).click();

    await expect(page.getByText('Cancelado', { exact: true })).toBeVisible();
    // O botão só aparece quando `canCancel` é `true` — some depois do
    // status virar `CANCELLED` (revalidado no servidor, `router.refresh()`
    // busca o pedido de novo).
    await expect(page.getByRole('button', { name: 'Cancelar pedido' })).toHaveCount(0);

    // Reflete também no histórico (`/conta/pedidos`), não só na página de
    // confirmação — mesmo pedido, telas diferentes.
    await page.goto('/conta/pedidos');
    await expect(page.getByText(/· Cancelado/)).toBeVisible();
  });
});
