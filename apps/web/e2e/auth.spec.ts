import { test, expect } from '@playwright/test';
import { fillSignupForm } from './helpers';

test.describe('Cadastro, login e logout', () => {
  test('cria conta completa, é redirecionado autenticado, e desloga', async ({ page }) => {
    await fillSignupForm(page, { marketingOptIn: true });
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL(/\/conta\/pedidos/);
    await expect(page.getByRole('heading', { name: 'Meus pedidos' })).toBeVisible();
    // Conta recém-criada nunca confirmou e-mail — banner precisa aparecer.
    await expect(page.getByText('Confirme seu e-mail')).toBeVisible();

    // Endereço do cadastro já fica salvo como principal.
    await page.goto('/conta/enderecos');
    await expect(page.getByText('Avenida Paulista, 1000')).toBeVisible();

    // Consentimento de SMS dado no cadastro aparece ligado nas preferências.
    await page.goto('/conta/preferencias');
    await expect(page.getByRole('switch')).toBeChecked();
    await expect(page.getByText('(11) 9****-7766')).toBeVisible();

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL('/');

    // Sessão realmente encerrada: voltar pra área logada pede login de novo.
    await page.goto('/conta/pedidos');
    await expect(page).toHaveURL(/\/entrar/);
  });

  test('cadastro valida celular, confirmação de senha e aceite dos termos', async ({ page }) => {
    await fillSignupForm(page, { acceptTerms: false });
    await page.getByLabel('Celular', { exact: true }).fill('1133334444');
    await page.getByLabel('Confirme a senha').fill('OutraSenha123!');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page.getByText('Confira os campos destacados abaixo.')).toBeVisible();
    await expect(page.getByText('Informe um celular válido com DDD.')).toBeVisible();
    await expect(page.getByText('As senhas não coincidem.')).toBeVisible();
    await expect(
      page.getByText('É preciso aceitar os Termos de Uso e a Política de Privacidade.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/criar-conta/);
  });

  test('login com credenciais inválidas mostra aviso destacado, sem navegar', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill('nao-existe@asn-e2e.dev');
    await page.getByLabel('Senha').fill('SenhaErrada123!');
    await page.getByRole('button', { name: 'Entrar' }).click();

    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível entrar' });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('E-mail ou senha incorretos.');
    // E-mail mantido, senha limpa pra redigitar.
    await expect(page.getByLabel('E-mail')).toHaveValue('nao-existe@asn-e2e.dev');
    await expect(page.getByLabel('Senha')).toHaveValue('');
    await expect(page).toHaveURL(/\/entrar/);
  });
});
