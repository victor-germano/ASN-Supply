# ASN Supply

> **E-commerce premium de tênis — Turborepo monorepo com Next.js 15 (storefront), NestJS 10 (API), design system compartilhado e Clean Architecture por domínio.**

---

## Arquitetura

Monorepo gerenciado por **pnpm workspaces** + **Turborepo**:

```
apps/
  web/      Next.js 15 (App Router) — storefront público
  api/      NestJS 10 — API REST (catálogo, carrinho, pedidos, pagamentos, admin)
packages/
  ui/       Design system — componentes React puros e acessíveis
  types/    Contratos compartilhados (DTOs/enums) entre web e api
  config/   Presets TypeScript, ESLint e tokens Tailwind (identidade visual)
```

**Decisões de design:**
- `packages/types` como fonte única de verdade dos contratos — o frontend importa tipos da API, nunca os inventa
- `packages/ui` sem regra de negócio — componentes recebem dados via props, sem `fetch` ou estado global
- `packages/config` centraliza identidade visual — cor, tipografia e espaçamento em um único arquivo, nenhum componente hardcoda hex
- NestJS com Clean Architecture por feature — `controllers / dto / entities / use-cases / repositories` por módulo de domínio

---

## Identidade Visual

| Token | Valor | Uso |
|---|---|---|
| `olive-500` | `#83815C` | Cor de assinatura — CTAs secundários, acentos |
| `ink` | `#16160F` | "Preto" premium — texto principal, CTA primário |
| `bone-100` | `#F7F5F0` | Off-white — fundo predominante |
| `font-display` | Cormorant Garamond | Títulos |
| `font-sans` | Inter | Corpo de texto, UI |

Definidos em [`packages/config/tailwind/tokens.js`](packages/config/tailwind/tokens.js).

---

## Status dos Módulos

| # | Módulo | Status |
|---|---|---|
| 0 | **Fundação** — monorepo, design tokens, schema de domínio | ✅ Concluído |
| 1 | **Home** — hero slider, lançamentos, coleções, newsletter | 🔨 Em progresso |
| 2 | **Listagem** — filtros, ordenação, busca, paginação | — |
| 3 | **Produto** — galeria, medidas, avaliações, relacionados | — |
| 4 | **Carrinho e checkout** — Stripe, Mercado Pago, PIX | — |
| 5 | **Área do cliente** — autenticação, pedidos, favoritos | — |
| 6 | **Painel admin** — produtos, pedidos, clientes, relatórios | — |
| 7 | **Provador Inteligente** — análise de harmonização de look via IA | — |
| 8 | **IA de moda, busca semântica, lookbook, comparador** | — |

---

## Rodando localmente

Pré-requisitos: Node 20+, pnpm 9+, Docker (Redis), projeto Firebase e app Algolia (nível gratuito dos dois serve — ver `docs/DEPLOY.md` seção 1).

```bash
pnpm install
docker compose up -d          # Redis

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# gerar INTERNAL_API_KEY compartilhada entre web e api:
node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"

pnpm --filter @asn/api exec tsx scripts/configure-algolia.ts   # configurar índice (1x por projeto Algolia)
pnpm --filter @asn/api db:seed   # catálogo de demonstração no Firestore

pnpm dev   # web em :3100, api em :3400
```

---

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe `apps/web` e `apps/api` em desenvolvimento |
| `pnpm build` | Build de produção via Turborepo (com cache) |
| `pnpm lint` | ESLint em todo o monorepo |
| `pnpm typecheck` | `tsc --noEmit` em todo o monorepo |
| `pnpm test` | Testes unitários (Vitest) em todo o monorepo |

---

## Histórico

[`docs/HISTORICO.md`](docs/HISTORICO.md) — registro narrativo do que foi construído, em que ordem e por quê.

---

## Licença

MIT
