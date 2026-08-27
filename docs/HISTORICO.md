# Histórico do Projeto — ASN Supply

Este arquivo é o registro de controle geral do projeto: o que foi construído,
em que ordem, por quê, e o que ficou pra depois. Não substitui o `git log`
(cada entrada aqui referencia o commit correspondente quando existe) nem o
README (que descreve a arquitetura _atual_, não a evolução) — este documento
é a linha do tempo narrativa.

**Convenção a partir de 21/08/2026**: toda vez que uma mudança de produto
(feature, módulo, decisão de arquitetura) for concluída, uma entrada nova é
adicionada aqui, mais recente no topo da seção "Em andamento" até ser
commitada, depois movida pra linha do tempo com o hash do commit. Entradas
levam: data, nome curto, status, o que foi feito, decisões relevantes, e
bugs reais encontrados/corrigidos (quando houve).

---

## Em andamento (ainda não commitado)

_Nada no momento._

---

## Linha do tempo (commitado)

### Módulo 0 — Fundação (06/08/2026, commit `4d67348`)

Monorepo pnpm + Turborepo. `packages/config` (tokens de marca, presets
TS/ESLint), `packages/types` (contratos compartilhados web↔api),
`packages/ui` (design system inicial: Button, Container, Section, Heading,
Text, Badge). `apps/api` (NestJS: config validada via Zod, Prisma global,
health check real, Helmet/CORS/rate limit). Schema Prisma de domínio
completo v1 (catálogo → checkout, cupons, avaliações, wishlist) já
desenhado para não exigir migração destrutiva nos módulos seguintes.
`apps/web` (Next 15 App Router). CI (GitHub Actions), Husky + commitlint.

### Módulo 1 — Home (07/08/2026, commit `ead659c`)

Banners, vitrine social, newsletter, catálogo (marcas/categorias/coleções/
produtos em destaque) com dado real. Home completa (Hero, Lançamentos,
Mais Vendidos, Coleções, Categorias, Marcas, Benefícios, Vitrine Social,
Newsletter, Sobre). Header/Footer globais e páginas institucionais.
**Achado**: seed inicial usava fotos de estoque do Unsplash que eram
majoritariamente produtos Nike reais com logo visível — trocado por arte
SVG abstrata própria (risco de marca em ambiente de demonstração).

### Módulo 2 — Listagem de Produtos (07/08/2026, commit `e05f7e5`)

`/produtos` (PLP): filtros multi-valor, ordenação, busca textual e
paginação real, 100% URL-driven (funciona sem JS pro essencial).
`/colecoes/[slug]`. Facetas com contagem calculadas no banco. Seed
expandido de 10 para 24 produtos. **Achados**: select "Ordenar por" sem
nome acessível no mobile; query string editada à mão (`pageSize=100`)
derrubava a página inteira sem tratamento.

### Módulo 3 — Página do Produto/PDP (07/08/2026, commit `c72c9b7`)

Galeria (zoom, vídeo, giro 360°, lightbox), variantes, avaliações,
perguntas e respostas, relacionados, vistos recentemente. `cartStore`
reescrito com itens reais; `wishlistStore`/`recentlyViewedStore` novos
(Zustand + localStorage). **Achado mais sério**: loop infinito (React #185)
em RecentlyViewed — seletor Zustand chamando `.filter()` a cada render.

### Módulo 4 — Carrinho e Checkout (07/08/2026, commit `f7100d7`)

Checkout guest (sem Área do Cliente ainda): 3 etapas (contato/endereço →
frete → revisão). `PaymentGateway` como porta + `NullPaymentGateway`
(sempre "indisponível", pronta para receber Stripe/Mercado Pago/PIX
depois). Estoque decrementado condicionalmente dentro de transação, preço
sempre relido no commit — nunca confia em nada calculado antes do commit
final. **Achado**: `generateOrderCode()` não garantia 8 caracteres de
verdade; sem retry de colisão de código.

### Fundação do Painel Admin (08/08/2026, commit `9dabffd`)

Só a base — `AdminAuthGuard` (bearer token fixo contra `ADMIN_API_KEY`),
sem nenhuma rota administrativa real ainda. Decisão explícita de pular a
área administrativa até a Área do Cliente existir (mesmo espírito do
`PaymentGateway`: porta pronta, adapter real depois). **Superado** em
21/08 pelo Acesso administrativo real (commit `a94a2a4`, abaixo).

### Provador Digital — Fase 1, simulado (10/08/2026, commit `411eaad`)

`/provador`: upload de foto (resize no client), escolha de produto,
`MockTryOnAnalyzer` (parecer sempre simulado, mas contextualizado com o
produto real — nunca texto genérico fingindo ser leitura real da foto).
Badge "Prévia" sempre visível quando `isSimulated`.

### Favoritos — página + correção institucional (16/08/2026, commit `119f4dc`)

`/favoritos` + `WishlistButton` no header (favoritar já existia desde o
Módulo 3, mas sem lugar pra revisar). Conteúdo institucional (FAQ, Trocas,
Privacidade) corrigido — descrevia Área do Cliente e pagamento online como
se já funcionassem. **Achado**: zustand 5.0.14 tinha bug real de tipos
(`persist` não compilava) — resolvido com update pra 5.0.15.

### Provador Digital — Fase 2, análise real (16/08/2026, commit `a60d27d`)

`ClaudeTryOnAnalyzer`: troca o parecer simulado por análise real via
Claude (`claude-haiku-4-5`, visão) quando `ANTHROPIC_API_KEY` está
configurada — `MockTryOnAnalyzer` continua como fallback automático sem a
chave (dev/CI não quebram). JSON estrito validado com zod antes de
responder.

---

> A partir daqui: sessão longa em 20–21/08/2026, organizada em commits
> atômicos por módulo/feature (em vez de um único commit grande) — cada
> entrada abaixo corresponde a exatamente um commit.

### Módulo 5 — Área do Cliente (autenticação, endereços, pedidos) (21/08/2026, commit `d0189de`)

- Já estava em andamento (não commitado) quando esta sessão começou.
- API: módulos `auth` (JWT login/registro/refresh/logout, guards,
  estratégia Passport, `Role.ADMIN/CUSTOMER/SUPPORT`), `addresses` (CRUD
  completo, um endereço padrão por usuário via transação serializable),
  `users`.
- Web: `/entrar`, `/criar-conta`, `/conta` (+ `pedidos`, `enderecos`),
  `middleware.ts` protegendo `/conta/:path*` com refresh proativo de
  sessão, `authCookies.ts` (cookies httpOnly), formulários de
  login/cadastro compartilhando componentes que antes eram exclusivos do
  checkout (`components/form/`).

### Checkout exige login (21/08/2026, commit `dc08d41`)

- Decisão do usuário: navegação, favoritos e carrinho continuam livres
  para visitante; só a intenção de pagar exige conta. `/checkout` entrou
  no matcher do middleware — sem sessão, redireciona para
  `/entrar?next=/checkout` e volta pra lá depois do login, carrinho
  intacto (`zustand persist`).
- A API não mudou: `OrdersController` continua aceitando pedido de
  convidado (`OptionalJwtAuthGuard`) — o gate é só do lado do site.

### Acesso administrativo (21/08/2026, commit `a94a2a4`)

- Rota oculta `/admin/entrar` (não linkada em nenhum menu, `noindex`) +
  `/admin` protegido por `Role.ADMIN` real via JWT — substituiu o
  `AdminAuthGuard` provisório (bearer-token fixo) do Módulo 6 original,
  exatamente como o comentário daquele código já previa.
- Primeiro admin promovido por script (nunca pelo cadastro público):
  `pnpm exec tsx scripts/promote-to-admin.ts email@x.com`.
- Cliente comum autenticado que tenta `/admin` volta pra `/` em silêncio,
  sem ser "convidado" a logar numa área que não é dele.

### Provador — "Complete o look" (21/08/2026, commit `06ec169`)

- Pedido original do usuário: integrar Shein/AliExpress/Shopee/Mercado
  Livre para sugerir roupas junto com o tênis. Investigação real: nenhuma
  dessas plataformas oferece hoje uma API pública acessível pra esse uso
  (Mercado Livre tem API aberta; AliExpress exige aprovação de afiliado;
  Shopee é por convite; Shein não tem API pública — só daria via scraping,
  que violaria os termos deles e não foi construído).
- Decisão (escolhida pelo usuário entre as opções apresentadas): curadoria
  manual. Modelo `LookItem` novo (plataforma, título, imagem, preço,
  link), exibido como seção "Complete o look" no resultado do Provador
  quando existe curadoria pro produto.
- Sem painel para cadastrar ainda — script CLI:
  `pnpm exec tsx scripts/add-look-item.ts --slug ... --platform ...`.

### Favoritos e carrinho ligados à conta (21/08/2026, commit `3b3b88a`)

- `WishlistItem`/`Cart`/`CartItem` existiam no schema desde o Módulo 0,
  nunca usados (favoritos/carrinho eram só `localStorage`). Agora
  sincronizam com o backend quando o cliente está logado, sem mudar
  nenhum componente existente — a sincronização observa as stores Zustand
  por fora (`WishlistSync`/`CartSync`, montados no layout raiz).
- Convidado continua 100% local, sem chamada nenhuma à API.
- No primeiro login: funde local com o que já existia na conta (favoritos
  por união; carrinho somando quantidade do mesmo item). Dali em diante,
  cada ação é espelhada em segundo plano.
- Testado direto na API (registro → favoritar → sincronizar; carrinho →
  ajustar quantidade → limpar).

### Cupom de desconto (21/08/2026, commit `8086319`)

- `Coupon` existia no schema desde o Módulo 0 sem nenhum código usando —
  agora: preview em tempo real no checkout (`POST /coupons/validate`,
  público, não consome o uso) e aplicação real + atômica na hora de
  confirmar o pedido (dentro da mesma transação que decrementa estoque —
  nunca confia no desconto calculado no navegador, respeita
  `maxRedemptions` mesmo sob concorrência).
- Sem painel para criar cupons ainda — script CLI:
  `pnpm exec tsx scripts/create-coupon.ts --code X --percent 10`.
- Testado: preview, aplicação com desconto correto, e o limite de usos
  barrando uma segunda tentativa.

### Busca global (21/08/2026, commit `52c9b7f`)

- Ícone de lupa no header (visível em qualquer página, não só em
  `/produtos`) — abre um painel com campo de busca, leva para
  `/produtos?q=...`.

### Painel Admin — CRUD de produtos (21/08/2026, commit `09d8f64`)

- `/admin/produtos`: lista com busca por nome, paginação, badge
  publicado/rascunho, estoque total.
- `/admin/produtos/novo` e `/admin/produtos/[id]`: formulário único
  (criação e edição) — nome, descrição, marca, categoria, coleção, gênero,
  preço, materiais/tecnologias, imagens e variantes (tamanho/cor/estoque)
  como listas dinâmicas.
- Backend (`admin-products` module): `JwtAuthGuard + RolesGuard +
@Roles('ADMIN')` — o mecanismo que o Módulo 6 original (fundação, sem
  rotas) já deixou pronto para ser plugado. Slug e SKU gerados
  automaticamente a partir do nome/tamanho/cor, com resolução de colisão.
- Testado ponta a ponta: criar (rascunho, some do catálogo público) →
  publicar (aparece na loja) → editar → excluir; 401 sem token, 403 pra
  cliente comum, só ADMIN passa.
- Bug encontrado e corrigido: os dropdowns de marca/coleção do formulário
  pediam `limit=200` aos endpoints públicos `/brands` e `/collections`,
  que têm teto de 48/12 — corrigido para os valores máximos reais.
- Fora de escopo por ora: upload de imagem (aceita só URL — sem
  Cloudinary/S3 configurado), CRUD de marca/categoria/coleção pelo próprio
  painel (ainda só produto).

### E-mails transacionais + reset de senha + verificação de e-mail (21/08/2026, commit `69b7dec`)

- `EmailModule` novo: mesmo padrão porta/adapter de `PaymentGateway`/
  `TryOnAnalyzer` — `ResendEmailSender` (real, via pacote `resend`) e
  `ConsoleEmailSender` (fallback sem `RESEND_API_KEY`, loga o conteúdo e o
  link no console da API em vez de enviar de verdade — dev/CI não
  dependem da credencial). Templates HTML simples com CSS inline (e-mail
  não renderiza `<style>` externo) na paleta da marca.
- "Esqueci minha senha": `/esqueci-senha` → `/redefinir-senha?token=...`.
  Sem tabela de tokens de uso único no banco — o token (JWT de 30min)
  carrega um fragmento de hash da senha atual (`pwv`); ao redefinir de
  verdade, a senha muda e o mesmo link nunca mais bate, invalidando-se
  sozinho. Testado: link novo funciona, senha antiga passa a falhar, o
  mesmo link reusado é rejeitado.
- Verificação de e-mail: enviada automaticamente no cadastro
  (fire-and-forget — falha de envio não derruba o cadastro),
  `/verificar-email?token=...` confirma, banner em `/conta` com "Reenviar
  e-mail" pra quem ainda não confirmou. Campo `emailVerifiedAt` (existia
  no schema desde o Módulo 0, nunca populado) agora exposto em
  `AuthenticatedUser`.
- E-mail de confirmação de pedido: disparado (fire-and-forget) ao criar
  um pedido, com código, total e link de acompanhamento.
- Contas só-OAuth (`googleId`/`appleId`, sem `passwordHash`) tratadas como
  "sem senha para redefinir" — mesma resposta genérica de "e-mail não
  encontrado", não revela o tipo de conta.
- Testado ponta a ponta direto na API: registro → e-mail de verificação
  logado com link → confirmação funciona; esqueci-senha (com e-mail
  existente e inexistente, sempre 204) → redefinição → login com senha
  nova funciona, antiga falha, reuso do link falha; pedido → e-mail de
  confirmação logado com total formatado certo.
- Achado durante o próprio teste: a primeira versão do `ConsoleEmailSender`
  removia todo HTML antes de logar, inclusive o `href` do link — o log
  mostrava o texto do botão sem URL nenhuma, inútil pra testar o fluxo.
  Corrigido para extrair `texto (url)` antes do strip genérico.

### Rastreio de pedido (21/08/2026, commit `ada0b83`)

- `Order` ganha `trackingCode`/`trackingUrl` (migração `add_order_tracking`)
  — preenchidos manualmente pelo admin, sem integração com transportadora
  real (nenhuma API de Correios/Melhor Envio configurada, mesmo espírito
  do frete fixo do Módulo 4).
- Painel admin ganha `/admin/pedidos` (lista, filtro por status) e
  `/admin/pedidos/[id]` (itens, endereço, formulário de status +
  rastreio). `OrdersRepository.updateStatus` (que já existia, comentado
  como "usado pelo painel admin — Fase 3" desde o Módulo 4) virou
  `updateForAdmin`, estendido pra também gravar rastreio.
- Marcar como "Enviado" com código preenchido dispara e-mail automático
  pro cliente — só na transição de status (não a cada correção
  posterior do código, testado explicitamente).
- Cliente vê o rastreio na página de confirmação (`/pedido/[id]`) quando
  preenchido, com link clicável se houver `trackingUrl`.
- Testado ponta a ponta: listagem admin, atualização de status com envio
  de e-mail, segunda atualização sem reenviar e-mail, 403 pra não-admin,
  exibição correta nas páginas admin e do cliente.

### Testes end-to-end — Playwright (21/08/2026, commit `1608a83`)

- `apps/web/playwright.config.ts` + `apps/web/e2e/*.spec.ts` (6 arquivos,
  12 testes): home (título, sem aba de login fixa), catálogo (listagem,
  busca pelo header), PDP (compra, favoritar como convidado), gate de
  checkout (adicionar ao carrinho sem login funciona, ir pro checkout
  pede conta), cadastro/login/logout completo, acesso administrativo
  (rota oculta acessível, `/admin` sem sessão redireciona, cliente comum
  é barrado em silêncio).
- `PLAYWRIGHT_SKIP_WEBSERVER=1` — variável nova (permanente, não só desta
  sessão): pula a auto-inicialização do dev server quando um já está no
  ar. Necessária porque o auto-launch do Playwright, contra este projeto
  em modo dev, tentou subir um SEGUNDO servidor Next na mesma pasta —
  dois processos `next dev` disputando a mesma pasta `.next` corrompeu o
  cache do Turbopack e derrubou o servidor de verdade com um panic
  (`TurbopackInternalError: Next.js package not found`). Reproduzido,
  diagnosticado e contornado nesta sessão.
- `expect.timeout`/`actionTimeout`/`navigationTimeout` subidos de 5s
  (padrão do Playwright) pra 15-30s: contra um dev server, a primeira
  visita a uma rota ainda não compilada pelo Turbopack pode legitimamente
  levar mais que 5s — não é frouxidão do teste, é realismo sobre o que
  "modo dev" significa (some contra um build de produção).
- Rodado de ponta a ponta contra o dev server real (não só typecheck):
  **12/12 passando**. Achados reais no caminho, todos de teste/config (não
  bugs do app — confirmado direto no banco que os cadastros realmente
  aconteceram mesmo quando a asserção falhava por timeout): timeout curto
  demais pro modo dev, e um seletor de link ambíguo (`"ASN SUPPLY"` sem
  `exact: true` casava também com o link do Instagram no rodapé).
- `pnpm test:e2e` (ou `test:e2e:ui` pra rodar com interface).

### Observability — Sentry + Analytics (21/08/2026, commit `901018a`)

- **Sentry** (rastreamento de erro) nos dois lados, sempre gated por
  `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` (sem a variável, o SDK roda com
  dsn vazio e não envia nada — comportamento padrão dele, mesmo espírito
  de todo o resto do projeto que depende de credencial externa):
  - **API**: `src/instrument.ts` (precisa ser o primeiro import de
    `main.ts`), captura manual em `HttpExceptionFilter` só pra erros 500+
    (um 404/400 esperado não devia virar ruído no Sentry).
  - **Web**: `instrumentation-client.ts` (runtime navegador),
    `sentry.server.config.ts`/`sentry.edge.config.ts` via
    `src/instrumentation.ts` (runtimes de servidor), `onRequestError`
    (Server Components/Actions aninhados), `global-error.tsx` novo (erro
    na própria raiz — `error.tsx` sozinho não alcança isso) e
    `error.tsx` existente atualizado pra reportar de verdade em vez de só
    `console.error` (o comentário dele já dizia "até termos Sentry ou
    similar" desde antes desta sessão).
  - `next.config.mjs` envolvido em `withSentryConfig` — upload de source
    map só acontece com `SENTRY_AUTH_TOKEN` configurada, e `telemetry:
false` pra nenhuma chamada de rede acontecer sem conta configurada.
- **Analytics**: Plausible (privacy-friendly, sem cookie, sem banner de
  consentimento LGPD necessário) — um `<script>` condicional
  (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`), sem SDK/dependência nova. Escolha
  não confirmada explicitamente pelo usuário (diferente do Resend) —
  trocar de provedor é só trocar `components/Analytics.tsx`.
- **Achado real, correção permanente**: builds do web ficaram
  anormalmente lentos (e o dev server emitia avisos de
  `import-in-the-middle`/`require-in-the-middle` "can't be external")
  depois de instalar `@sentry/nextjs` — causa raiz é um problema conhecido
  de pnpm com OpenTelemetry (dependência transitiva do Sentry): pnpm
  isola dependências transitivas de um jeito que o bundler não consegue
  resolver esses dois pacotes específicos a partir da pasta do projeto.
  Corrigido instalando os dois como dependência direta em `apps/web`
  (fix documentado pelo próprio ecossistema Sentry+pnpm, não workaround
  frágil).
- **Limitação conhecida deste sandbox, não da integração**: `next build`
  (produção, webpack) sofreu `EINVAL: invalid argument, readlink` na
  pasta `.next` várias vezes durante a validação — o mesmíssimo problema
  de sincronização do OneDrive com a pasta `.next` já visto repetidas
  vezes nesta sessão em builds sem nenhuma relação com Sentry. `pnpm dev`
  (Turbopack, o comando real do dia a dia) roda limpo, sem erro nem
  aviso, depois do fix de `import-in-the-middle`; `typecheck`/`lint`
  passam nos dois apps. Não bloqueei o restante do trabalho nisso —
  validar um `next build` completo neste ambiente específico fica
  pendente pra quando o projeto rodar num disco não sincronizado pelo
  OneDrive (ex: CI, ou produção de verdade).

### Copy de PDP após Área do Cliente (21/08/2026, commit `7d51f64`)

`QuestionsSection`/`ReviewsSection` ainda diziam "faça login" / "área do
cliente (em breve)" — texto escrito antes da Área do Cliente existir de
verdade. Login já existe; o que falta é só enviar perguntas e avaliar
compras direto por essas seções específicas, não a conta em si — copy
ajustada para refletir isso com precisão.

### Fix — apiClient perdia o header de Authorization (21/08/2026, commit `e9a9e39`)

Achado ao testar `authenticatedFetch`/endereços de ponta a ponta:
`{ 'Content-Type': ..., ...options.init?.headers }` não copiava nada
quando `headers` era uma instância de `Headers` (é o que
`authenticatedFetch.ts` passa, com `Authorization: Bearer ...` setado) —
`Headers` expõe seus pares via iterador, não como propriedades próprias
enumeráveis, então o spread literal perdia o header em silêncio. Toda
chamada autenticada saía sem `Authorization`. Corrigido usando
`new Headers(...)` para mesclar de verdade. Um segundo bug foi corrigido
junto: `response.json()` chamado incondicionalmente lançava em qualquer
resposta 204 No Content (ex: `DELETE /addresses/:id`).

### Módulo 8 — Comparador + Busca por estilo (IA) (21/08/2026, commit `bde86f4`)

Escopo dos 4 itens do roadmap original ("IA de moda, busca semântica,
lookbook, comparador"): dois construídos por completo, dois adiados
deliberadamente — ver justificativa abaixo, mesmo padrão de "decisão
registrada, não esquecimento" de todo módulo anterior.

- **Comparador**: `compareStore` (Zustand + localStorage, até 4 produtos,
  mesmo padrão local-first de `wishlistStore`). Botão de comparar na grade
  da PLP (`CompareToggle`, overlay sobre `ProductCard`) e na PDP
  (`ProductActions`). Barra flutuante global (`CompareBar`, montada no
  layout raiz) aparece com 2+ selecionados, some sozinha com menos.
  `/comparar`: tabela lado a lado (marca, preço, avaliação, gênero,
  materiais, tecnologias, tamanhos em estoque, cores) — busca
  `ProductDetail` completo de cada item via `getProductBySlug` já
  existente, nenhum endpoint novo precisou ser criado no backend.
- **Busca por estilo** (une "IA de moda" + "busca semântica" de forma
  pragmática): `POST /products/ai-search` reaproveita a mesma
  `ANTHROPIC_API_KEY` do Provador Digital — manda o catálogo inteiro
  (dúzias de produtos, não milhares) num prompt e pede pra Claude
  escolher os mais relevantes pro pedido em linguagem natural do
  cliente, com uma frase de raciocínio. Sem a chave configurada, cai no
  fallback de busca textual comum (`isAiPowered: false`, sem resumo) —
  nunca finge análise que não aconteceu, mesmo princípio do
  `MockTryOnAnalyzer`. Painel próprio em `/produtos` (`AiStyleSearch`),
  separado da busca instantânea por texto que já existia (aquela
  dispara por tecla; esta por submit, por chamar IA do lado do servidor).
  Testado ponta a ponta: fallback textual funcionando (sem chave
  configurada neste ambiente), validação de query curta rejeitada.
- **Adiado deliberadamente — Lookbook**: exigiria fotografia
  editorial/de still-life de looks completos, que não existe (mesmo
  motivo do catálogo usar arte SVG abstrata em vez de fotos de produto
  reais — ver Módulo 1). Construir a UI agora, sem conteúdo real pra
  popular, seria estrutura vazia; melhor esperar ter curadoria de
  verdade (como "Complete o look" do Provador, que também depende de
  curadoria manual — ver aquela entrada).
- **Busca vetorial/embeddings de verdade**: não implementada — o
  catálogo atual (dúzias de produtos) cabe inteiro num prompt de LLM sem
  problema; embeddings/pgvector só se justificam numa escala que este
  catálogo ainda não tem. Documentado aqui pra revisitar se o catálogo
  crescer muito.

### Marca d'água sutil no login/cadastro (27/08/2026, commit `df7cf77`)

Pedido antigo do usuário, finalmente resolvido — a logo real (colada
depois em PDF na conversa) nunca chegou como arquivo em disco neste
ambiente, só como conteúdo visual; a marca foi desenhada à mão em SVG
(`LogoMark`) a partir do que foi visto, fiel o bastante pra um
elemento decorativo a 3,5% de opacidade atrás dos formulários de
`/entrar`, `/criar-conta` e `/admin/entrar` (`AuthBackground`). Se um
dia precisar de fidelidade pixel-perfect, trocar por um SVG exportado
direto do arquivo original é suficiente.

### Endereço salvo selecionável no checkout (27/08/2026, commit `37032ed`)

A API já aceitava `addressId` desde a Área do Cliente, mas escolher um
endereço salvo direto no checkout não tinha UI própria. `AddressSelector`
só aparece pra cliente autenticado com pelo menos um endereço salvo —
convidado nunca vê isto. Endereço padrão pré-selecionado automaticamente;
os campos digitados (ocultos nesse caso) recebem os mesmos valores via
`setValue` só pra manter a validação e o resumo funcionando — o pedido em
si sempre vai com `addressId` quando há seleção, nunca com uma cópia que
pode estar desatualizada em relação ao endereço salvo de verdade.

### CRUD de marca/categoria/coleção no painel admin (27/08/2026, commit `2aaa25c`)

O Painel Admin (Módulo 6) cobriu só produto; marca/categoria/coleção
ficaram de fora do escopo na época e só eram editáveis direto no banco.
`AdminCatalogModule` (API) fecha essa lacuna — mesmo mecanismo de acesso
das rotas administrativas já existentes. `/admin/catalogo` (Web) usa abas
em vez de páginas dedicadas como em Produtos: os formulários são pequenos
o bastante (2 a 5 campos) pra não justificar a mesma estrutura. Checagem
de ciclo na árvore de categorias (uma categoria não pode virar pai dela
mesma, direto ou via um descendente); erros de FK ao excluir marca/
categoria ainda em uso viram mensagem clara, não 500 cru do Prisma.

### Cliente envia pergunta/avaliação pela própria conta (27/08/2026, commit `1cffbbf`)

O schema de `Review` já exigia `userId` desde o Módulo 0, e o comentário
em `ProductQuestion` já previa isto: "perguntar de fato fica bloqueado
até [a Área do Cliente existir]". `POST /reviews` e `POST /questions`,
ambos atrás de `JwtAuthGuard` — `authorName`/`askerName` sempre vêm do
usuário autenticado, nunca de texto livre do body. Uma avaliação por
cliente por produto (409 na segunda tentativa); `isVerifiedPurchase`
calculado pelo servidor a partir do histórico real de pedidos, nunca
aceito do client; `Product.averageRating`/`reviewCount` (cache
denormalizado desde o Módulo 0, nunca populado até agora) recalculados
na mesma transação da criação da avaliação.

### Upload de imagem no painel admin — Cloudinary (27/08/2026, commit `676b0b4`)

`CLOUDINARY_URL` já estava reservada no `.env.example` desde o Módulo 0,
nunca usada. Mesmo padrão porta/adapter do resto do projeto —
`ImageUploader`/`CloudinaryImageUploader`/`UnavailableImageUploader` —
só que aqui não existe fallback gracioso de verdade (não tem como
inventar uma imagem sem upload configurado): o fallback lança 503
explícito, e o formulário cai de volta pro campo de URL colada, que
sempre funcionou. `ImageUploadField` (Web) reaproveitado pelos quatro
formulários que pedem imagem (produto, marca, categoria, coleção); em
`ProductForm`, o upload também preenche largura/altura automaticamente
a partir do resultado real da Cloudinary.

### Login social com Google (27/08/2026, commit `968a385`)

`googleId`/`appleId` em `User` já existiam desde o Módulo 0,
`GOOGLE_OAUTH_CLIENT_ID`/`_SECRET` já reservadas no `.env.example`,
nunca plugadas. Mesmo padrão porta/adapter: sem as credenciais, o
botão nem aparece na Web (`NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`) e
`GoogleAuthGuard` barra a rota com 503 antes de qualquer redirect real
acontecer. `AuthService.loginWithGoogle` cobre três casos — já logou
com Google antes, conta existente com senha no mesmo e-mail (associa
em vez de duplicar), ou conta nova sem senha. Tokens voltam da API pro
navegador pelo `#fragment` da URL (nunca `?query`) — fragmentos nunca
saem do navegador, não aparecem em log de acesso nem no header
`Referer` de terceiros.

---

### Testes e2e passam a rodar no CI (27/08/2026, commit `8fb4563`)

Os 12 testes e2e (Playwright) existiam desde a sessão anterior, mas só
rodavam localmente — o workflow do GitHub Actions (job `quality`) nunca
os chamava, então uma regressão nesses fluxos nunca teria travado um PR.
Novo job `e2e`, depende de `quality` passar primeiro; sobe os dois apps
em modo produção (não `dev`/`--watch`, mais rápido e estável em CI) com
`NEXT_PUBLIC_*` corretos ANTES do build (Next inline-a essas variáveis
no bundle do client, não lê em runtime); migra + semeia o banco (os
testes navegam o catálogo de verdade); `PLAYWRIGHT_SKIP_WEBSERVER=1`
pra não colidir com os servidores já subidos manualmente. Relatório do
Playwright sobe como artefato só quando o job falha.

### Gestão de clientes no painel admin (27/08/2026, commit `c546cef`)

Não existia tela nenhuma pra ver/gerenciar clientes — promover alguém a
admin só era possível via `scripts/promote-to-admin.ts`, direto no
banco (que continua sendo o único jeito de criar o PRIMEIRO admin,
antes de existir um painel pra ele entrar). `GET /admin/users` (lista
paginada, busca por nome/e-mail, contagem de pedidos via `_count` sem
N+1) e `PATCH /admin/users/:id/role` — este último barra explicitamente
alterar o PRÓPRIO papel (um admin sozinho não pode se rebaixar sem
querer e ficar trancado pra fora do próprio painel). `/admin/clientes`
(Web) reflete a mesma proteção na UI: o seletor de papel já vem
desabilitado na própria linha do admin logado.

### Cancelamento de pedido pelo cliente (27/08/2026, commit `249b818`)

`Order.canCancel` — campo novo, calculado sempre no servidor (nunca
deduzido no client) combinando posse (é o dono do pedido?) e status
(`PENDING_PAYMENT`/`PAID`, antes de `PROCESSING`) numa coisa só, pra
`OrderConfirmation` não precisar reimplementar nenhuma das duas regras.
`OrdersRepository.toOrder()` sempre devolve `canCancel: false` (não sabe
quem está perguntando); só `OrdersService` sobrescreve com o valor real,
em todo caminho que devolve um `Order` (`create`/`findById`/
`findManyForUser`).

`POST /orders/:id/cancel` (`JwtAuthGuard`, nunca `OptionalJwtAuthGuard`
— convidado não tem como provar posse) revalida posse + status de novo
no servidor (nunca confia no `canCancel` já exposto) e reverte, numa
transação, os dois efeitos colaterais que `create()` causou: devolve a
quantidade ao estoque de cada item, e decrementa `Coupon.redemptionCount`
se o pedido usou cupom (guardado com `gt: 0`, defensivo). Botão
"Cancelar pedido" (`CancelOrderButton`, com confirmação) só aparece em
`OrderConfirmation` quando `order.canCancel` é `true`.

### Cobertura e2e expandida (27/08/2026)

Os 6 specs originais (Playwright) cobriam só até o Módulo 4 — tudo
construído depois (avaliações/perguntas, cupom, comparador, busca por
IA, CRUD de catálogo no admin, rastreio, cancelamento de pedido, login
com Google, upload de imagem) nunca tinha teste e2e nenhum. Mais 9
specs novos, todos reaproveitando os mesmos padrões dos existentes
(um e-mail único por conta criada, `window.confirm` aceito antes do
clique que dispara o dialog).

`prisma/seed.ts` ganhou duas fixtures fixas (`seedE2EFixtures`), sem as
quais boa parte disso não tinha como rodar: uma conta `ADMIN` fixa
(`e2e.admin@example.com`, limpa e recriada a cada seed junto com o resto
do domínio `@example.com`) e um cupom sempre válido (`E2E10`, 10% off,
sem mínimo/validade). Ambas só existem em bancos de desenvolvimento/CI
— o mesmo seed "destrutivo por design" que já nunca roda em produção.

- `reviews-questions.spec.ts` — cliente autenticado envia avaliação e
  pergunta na PDP, e as duas aparecem na página.
- `coupon-checkout.spec.ts` — aplica o cupom fixo na revisão do
  checkout, confirma que a linha "Desconto" aparece (não só que o
  código foi aceito).
- `order-cancellation.spec.ts` — cliente cancela um pedido recém-criado;
  confirma que o botão some e o status vira "Cancelado" tanto na
  confirmação quanto no histórico.
- `admin-catalog-crud.spec.ts` — cria, edita e exclui uma marca em
  `/admin/catalogo`.
- `admin-order-tracking.spec.ts` — duas sessões (`browser.newContext()`
  pra não perder o login do cliente): admin marca como "Enviado" com
  rastreio, cliente revisita a própria confirmação e vê o rastreio.
- `compare.spec.ts` — seleciona 2 produtos na listagem, compara lado a
  lado em `/comparar`.
- `ai-search.spec.ts` — busca por "Nova Court" (nome real de produtos no
  seed) confirma que o fallback textual (sem `ANTHROPIC_API_KEY`, nunca
  setada no job `e2e` do CI) ainda encontra resultado, não só a IA.
- `oauth-and-uploads.spec.ts` — sem credenciais (nunca setadas no CI, de
  propósito): botão "Continuar com Google" nem aparece; upload de imagem
  falha com a mensagem clara de `UnavailableImageUploader`, e o campo de
  URL continua funcionando normalmente.

`helpers.ts` (novo, nenhum arquivo termina em `.spec.ts` — o Playwright
nunca os roda como teste) reúne o que os specs novos repetiam: criar
conta, logar como admin, adicionar o primeiro produto ao carrinho, e
percorrer os 3 passos do checkout até a confirmação.

**Limitação desta sessão**: sem Postgres/Docker disponíveis neste
sandbox, não foi possível rodar o `db:seed` nem o Playwright de verdade
contra um servidor local pra confirmar os specs passando — a primeira
execução real acontece no job `e2e` do CI, no próximo push. Cada
seletor foi conferido direto contra o componente real (label, texto de
botão, mensagem de erro) em vez de assumido, mas isso não substitui uma
rodada real.

### Painel administrativo — dashboard real em `/admin` (27/08/2026)

`/admin` era um placeholder literal desde a fundação do painel (Módulo
6): o texto dizia "CRUD de produtos, pedidos e clientes ainda não foi
construído" muito depois de tudo isso já existir — sobrou de antes de
`AdminProductsModule`/`AdminUsersModule`/pedidos existirem, nunca
atualizado. `GET /admin/dashboard` (`AdminDashboardModule`) agrega o
que os outros módulos já gravam — nenhuma tabela nova, só `count`/
`aggregate` em paralelo: faturamento (soma de pedidos `PAID` em diante,
`PENDING_PAYMENT` não conta como venda ainda), total de pedidos,
pedidos aguardando pagamento, clientes, produtos publicados, e os 5
pedidos mais recentes. `/admin` agora mostra isso em vez do texto
fixo; e2e novo (`admin-access.spec.ts`) confirma que o texto antigo
("ainda não foi construído") não pode voltar a aparecer.

### Testes unitários do dashboard admin (27/08/2026)

O dashboard (commit anterior) tinha ficado só com cobertura e2e — a
regra de negócio "o que conta como faturamento" morava numa constante
solta dentro de `AdminDashboardRepository`, sem teste isolado nenhum.
Extraída pra `revenue-status.ts` (`isRevenueStatus`/`revenueStatusList`),
mesmo padrão de `orders/cancellation.ts` (`isOrderCancellableStatus`):
uma fonte de verdade única, testável sozinha, sem precisar mockar o
Prisma — este projeto nunca testa repositório contra um Prisma mockado
(convenção existente: repositórios que falam com o banco só são
verificados via e2e; o que tem regra de negócio isolável vira uma
função pura testada à parte). `admin-dashboard.controller.spec.ts`
fecha o padrão de `AdminUsersController.spec.ts` — mesmo sendo um
delegate simples aqui (sem branch pra testar), documenta o contrato de
retorno.

## Como manter isto atualizado

Ao final de qualquer mudança de produto (não de tooling/config isolado),
adicionar uma entrada em "Em andamento" com: data, nome curto, o que foi
feito, decisões tomadas (principalmente as que o usuário escolheu entre
opções), e bugs reais encontrados. Quando a mudança for commitada, mover a
entrada pra "Linha do tempo" com o hash e resumir se necessário.
