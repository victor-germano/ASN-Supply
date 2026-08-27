import { defineConfig, devices } from '@playwright/test';

/**
 * Porta 3000 é o padrão documentado no README (`pnpm dev`) — sobrescrita
 * por `PLAYWRIGHT_BASE_URL` quando necessário (ex: nesta sessão de
 * desenvolvimento, onde a porta 3000 já estava ocupada por outro processo
 * e o dev server real subiu em :3050).
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }]],
  // 5s (padrão do Playwright) não é suficiente contra um dev server: a
  // primeira visita a uma rota ainda não compilada pelo Turbopack pode
  // levar bem mais que isso (visto na prática nesta sessão — até dezenas
  // de segundos no pior caso), fora do tempo normal de round-trip de uma
  // Server Action. Não é frouxidão do teste, é realismo sobre o que "modo
  // dev" significa; contra um build de produção isso sobra.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // `reuseExistingServer: true` mesmo fora de CI: se um dev server já
  // estiver rodando na porta certa (o caso comum ao rodar os testes
  // localmente), reaproveita em vez de tentar subir um segundo e falhar
  // por porta ocupada.
  ...(process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? {}
    : {
        webServer: {
          command: 'pnpm dev',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
