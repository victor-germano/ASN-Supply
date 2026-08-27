# ASN Supply

E-commerce premium de tênis — curadoria de marcas e edições exclusivas, com um diferencial de
Provador Inteligente assistido por IA.

> O agente de emissão de NF-e que existia anteriormente neste repositório foi preservado em
> [`legacy/agente-emissao-nf`](legacy/agente-emissao-nf) como projeto independente e não faz parte
> desta plataforma.

## Arquitetura

Monorepo gerenciado por **pnpm workspaces** + **Turborepo**:

```
apps/
  web/      Next.js 15 (App Router) — storefront público
  api/      NestJS 10 — API REST (catálogo, carrinho, pedidos, pagamentos, admin)
packages/
  ui/       Design system — componentes React puros e acessíveis
  types/    Contratos de dados (DTOs/enums) compartilhados entre web e api
  config/   Presets de TypeScript, ESLint e tokens Tailwind (identidade visual)
```

### Por que esta estrutura

- **`packages/types` como fonte única de verdade dos contratos**: o frontend nunca inventa o
  formato de um objeto vindo da API — importa o tipo de `@asn/types`. Reduz drift entre back e
  front a zero.
- **`packages/ui` sem regra de negócio**: cada componente recebe dados via props e não conhece
  `fetch`, rotas ou estado global — pode ser reaproveitado em `apps/web` e em um futuro painel
  administrativo sem adaptação.
- **`packages/config` centraliza a identidade visual**: cor, tipografia e espaçamento vivem em um
  único arquivo (`packages/config/tailwind/tokens.js`). Nenhum componente hardcoda um hex ou
  tamanho de fonte.
- **NestJS com Clean Architecture por feature**: cada módulo de domínio organiza
  `controllers / dto / entities / use-cases / repositories` — regra de negócio isolada de
  framework e de infraestrutura (Prisma, Redis, gateways de pagamento).

## Identidade visual

| Token                               | Uso                                                    |
| ----------------------------------- | ------------------------------------------------------ |
| `olive-500` (`#83815C`)             | Cor de assinatura da marca — CTAs secundários, acentos |
| `ink` (`#16160F`)                   | "Preto" premium — texto principal, CTA primário        |
| `bone-100` (`#F7F5F0`)              | Off-white — fundo predominante                         |
| `font-display` (Cormorant Garamond) | Títulos                                                |
| `font-sans` (Inter)                 | Corpo de texto, UI                                     |

Definidos em [`packages/config/tailwind/tokens.js`](packages/config/tailwind/tokens.js).

## Rodando localmente

Pré-requisitos: Node 20+, pnpm 9+, Docker (para Postgres/Redis locais).

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir Postgres + Redis
docker compose up -d

# 3. Configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Gerar client Prisma e rodar a primeira migração
pnpm --filter @asn/api db:generate
pnpm --filter @asn/api db:migrate:dev

# 5. Subir tudo em modo dev (web em :3000, api em :3333)
pnpm dev
```

## Scripts principais

| Comando          | O que faz                                                              |
| ---------------- | ---------------------------------------------------------------------- |
| `pnpm dev`       | Sobe `apps/web` e `apps/api` em modo desenvolvimento                   |
| `pnpm build`     | Build de produção de todos os apps/packages (via Turborepo, com cache) |
| `pnpm lint`      | ESLint em todo o monorepo                                              |
| `pnpm typecheck` | `tsc --noEmit` em todo o monorepo                                      |
| `pnpm test`      | Testes unitários (Vitest) em todo o monorepo                           |

## Histórico do projeto

[`docs/HISTORICO.md`](docs/HISTORICO.md) é o registro narrativo de tudo que foi construído, em que
ordem, por quê, e o que ficou pra depois — atualizado a cada mudança de produto. Este README
descreve o estado _atual_; aquele documento descreve a _evolução_.

## Roteiro de módulos

O produto é construído módulo a módulo — cada um com plano técnico próprio, implementação
completa e validação antes de avançar para o próximo:

0. **Fundação** — este módulo: monorepo, design tokens, schema de domínio, esqueleto de app.
1. **Home** — hero slider, lançamentos, coleções, categorias, newsletter.
2. **Listagem de produtos** — filtros, ordenação, busca, paginação.
3. **Página do produto** — galeria, medidas, avaliações, relacionados.
4. **Carrinho e checkout** — Stripe, Mercado Pago, PIX.
5. **Área do cliente** — autenticação, pedidos, favoritos, endereços.
6. **Painel administrativo** — produtos, pedidos, clientes, relatórios.
7. **Provador Inteligente** — análise de harmonia de look via IA.
8. **IA de moda, busca semântica, lookbook, comparador**.
