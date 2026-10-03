import { test, expect } from '@playwright/test';
import { completeCheckout, loginAsAdmin, signUp } from './helpers';
import { decidedConsentState } from './consent-state';

/**
 * Regressão: `OrderItem` apontava pra variante/produto sem `onDelete`, e a
 * edição recriava todas as variantes — depois do PRIMEIRO pedido de um
 * produto, salvar ou excluir esse produto no admin dava 500 pra sempre.
 * Produto próprio do teste (não o primeiro do catálogo, que outros specs
 * usam em paralelo), nome sem acento pra slug previsível.
 */
test.describe('Produto que já tem pedido', () => {
  test('admin edita e exclui o produto, e o pedido do cliente continua íntegro', async ({
    page,
    browser,
  }) => {
    const productName = `Produto E2E ${Date.now()}`;
    const slug = productName.toLowerCase().replace(/\s+/g, '-');

    // Admin cadastra e publica um produto com 1 variante.
    await loginAsAdmin(page);
    await page.goto('/admin/produtos/novo');
    await page.getByLabel('Nome').fill(productName);
    await page.getByLabel('Descrição').fill('Produto criado pelo teste de regressão.');
    await page.getByLabel('Marca').selectOption({ index: 1 });
    await page.getByLabel('Categoria').selectOption({ index: 1 });
    await page.getByLabel('Preço (R$)').fill('199.90');
    await page.getByLabel('Publicado (visível na loja)').check();
    await page.locator('[name="images.0.url"]').fill('/seed-art/art-01.svg');
    await page.locator('[name="images.0.alt"]').fill(productName);
    await page.locator('[name="variants.0.size"]').fill('40');
    await page.locator('[name="variants.0.colorName"]').fill('Preto');
    await page.locator('[name="variants.0.stockQuantity"]').fill('5');
    await page.getByRole('button', { name: 'Criar produto' }).click();
    await expect(page).toHaveURL('/admin/produtos');

    // Cliente (outra sessão) compra esse produto.
    const customerContext = await browser.newContext({ storageState: decidedConsentState });
    const customer = await customerContext.newPage();
    await signUp(customer);
    await customer.goto(`/produtos/${slug}`);
    await customer
      .locator('fieldset', { hasText: 'Tamanho' })
      .locator('button:not([disabled])')
      .first()
      .click();
    await customer.getByRole('button', { name: 'Adicionar ao Carrinho' }).click();
    await expect(customer.getByText('Adicionado ao carrinho.')).toBeVisible();
    const orderId = await completeCheckout(customer);

    // Admin edita o preço do produto vendido — antes disto, 500.
    await page.goto('/admin/produtos');
    await page.getByRole('link', { name: productName }).click();
    await expect(page.getByLabel('Preço (R$)')).toHaveValue('199.9');
    await page.getByLabel('Preço (R$)').fill('149.90');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page).toHaveURL('/admin/produtos');
    const row = page.locator('tr', { hasText: productName });
    await expect(row.getByText('R$ 149,90')).toBeVisible();

    // E exclui — também era 500.
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Excluir' }).click();
    // Espera a própria tabela atualizar (a action termina e faz refresh) —
    // recarregar logo após o clique abortava a exclusão ainda em voo.
    await expect(page.getByRole('link', { name: productName })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('link', { name: productName })).toHaveCount(0);

    // O pedido do cliente continua abrindo, com a cópia do item.
    await customer.goto(`/pedido/${orderId}`);
    await expect(customer.getByText(productName)).toBeVisible();
    // 1 clique em "Adicionar" = 1 unidade (o carrinho de quem acabou de
    // entrar chegou a dobrar a quantidade — ver `CartSync`).
    await expect(customer.getByText(/Qtd\. 1$/)).toBeVisible();
    await expect(customer.getByText('R$ 199,90').first()).toBeVisible();

    await customerContext.close();
  });
});
