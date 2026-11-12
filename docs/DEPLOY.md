# Publicação da ASN Supply

Roteiro para colocar a loja no ar com domínio do Registro.br. A loja tem
duas peças que rodam código: o **site** (`apps/web`, Next.js) e a **API**
(`apps/api`, NestJS). Não há banco próprio para provisionar — os dados
vivem no **Firestore** (Firebase) e a busca/filtro do catálogo no
**Algolia**, ambos serviços gerenciados; Redis não é necessário.

Endereços usados como exemplo (trocar pelo domínio real):

| Peça | Endereço                           |
| ---- | ---------------------------------- |
| Site | `https://asnsupply.com.br` e `www` |
| API  | `https://api.asnsupply.com.br`     |

## 1. O que contratar/criar

- **Hospedagem que rode Docker ou Node 20** para o site e para a API
  (Railway, Render, Fly.io ou um VPS), com HTTPS automático.
- **Projeto no Firebase** (console.firebase.google.com), plano Spark
  (gratuito): ativar o **Firestore** (modo nativo) e gerar uma
  **service account** (Configurações do projeto › Contas de serviço ›
  Gerar nova chave privada — baixa um `.json`).
- **App no Algolia** (algolia.com), plano gratuito: criar um app e
  anotar o App ID e a Admin API Key.
- **Conta na Cloudinary** (cloudinary.com), plano gratuito: obrigatória
  — é o único destino do upload de imagem do painel admin. O "Product
  Environment Credentials URL" do dashboard já vem pronto no formato
  certo (`cloudinary://key:secret@cloud`).
- Opcionais, que entram depois só preenchendo variáveis: Twilio (SMS),
  chave da Anthropic (análise de foto no Provador), Plausible
  (estatísticas), login com Google.

## 2. Ordem de publicação

A ordem importa: o site é gerado com os dados da API, então **a API sobe
primeiro**.

1. Criar o projeto Firebase (Firestore) e o app Algolia (seção 1) e
   anotar as credenciais.
2. Publicar a API (`apps/api/Dockerfile`, contexto de build = raiz do
   repositório) com as variáveis da seção 3.
3. Conferir `https://api.SEU-DOMINIO/v1/health`.
4. Configurar os índices do Algolia, uma vez (seção 4).
5. Carga inicial e conta da administradora (seção 5).
6. Publicar o site (`apps/web/Dockerfile`, mesmas regras) com as variáveis
   da seção 3 — as `NEXT_PUBLIC_*` são argumentos de **build**.
7. Apontar o domínio (seção 6).

Sem Docker, os comandos equivalentes são, na raiz:
`pnpm install --frozen-lockfile`, `pnpm --filter @asn/types build`,
`pnpm --filter @asn/ui build`, `pnpm --filter @asn/api build`,
`pnpm --filter @asn/web build`; e para iniciar:
`pnpm --filter @asn/api start`, `pnpm --filter @asn/web start`.

## 3. Variáveis de ambiente

### API

| Variável                                                                       | Valor                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `NODE_ENV`                                                                     | `production`                                                                    |
| `PORT`                                                                         | a porta que a hospedagem informar (padrão 3400)                                 |
| `FIREBASE_SERVICE_ACCOUNT_BASE64`                                              | o `.json` da service account do Firebase, em base64 numa linha só (ver seção 1) |
| `ALGOLIA_APP_ID`, `ALGOLIA_ADMIN_API_KEY`                                      | do app criado no Algolia                                                        |
| `CLOUDINARY_URL`                                                               | da conta Cloudinary (seção 1)                                                   |
| `JWT_SECRET`                                                                   | 48+ caracteres aleatórios, **novo** (não o do `.env` local)                     |
| `INTERNAL_API_KEY`                                                             | 48+ caracteres aleatórios — o **mesmo** valor no site                           |
| `WEB_APP_URL`                                                                  | `https://asnsupply.com.br`                                                      |
| `CORS_ALLOWED_ORIGINS`                                                         | `https://asnsupply.com.br,https://www.asnsupply.com.br`                         |
| `TRUST_PROXY_HOPS`                                                             | `1` (hospedagem com balanceador na frente)                                      |
| `PIX_KEY`, `PIX_RECEIVER_NAME`, `PIX_RECEIVER_CITY`, `PIX_HOLDER_DISPLAY_NAME` | os mesmos do `.env` local                                                       |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`               | Gmail da loja + **senha de app** (sem ela nenhum e-mail sai)                    |

Gerar um segredo: `node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"`.

Gerar o base64 da service account:

```bash
# Linux/macOS
base64 -w0 service-account.json
```

```powershell
# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

A API **se recusa a iniciar** em produção sem `INTERNAL_API_KEY`, sem
`CLOUDINARY_URL`, sem `FIREBASE_SERVICE_ACCOUNT_BASE64` ou com o
`JWT_SECRET` de exemplo — a mensagem de erro diz o que falta.

### Site

| Variável                    | Valor                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`      | `https://asnsupply.com.br` — o `https` liga HSTS e a CSP estrita |
| `NEXT_PUBLIC_API_URL`       | `https://api.asnsupply.com.br/v1`                                |
| `NEXT_PUBLIC_PIX_ENABLED`   | `true`                                                           |
| `INTERNAL_API_KEY`          | o mesmo da API (build **e** execução)                            |
| `NEXT_PUBLIC_LEGAL_ID`      | identificação legal no rodapé, quando definida                   |
| `NEXT_PUBLIC_CONTACT_EMAIL` | só se o e-mail de contato mudar                                  |

## 4. Configurar o Algolia (uma vez)

O índice e as réplicas de ordenação não existem sozinhos — rodar, com a
API já publicada e as variáveis `ALGOLIA_*` configuradas (local ou via
console da hospedagem), dentro de `apps/api`:

```bash
pnpm exec tsx scripts/configure-algolia.ts
```

Reconstrói atributos buscáveis/facetáveis e as réplicas de ordenação
(preço, nota, mais recentes). Idempotente — rodar de novo não duplica nada.

## 5. Carga inicial e administradora

Rodar **uma vez**, com `FIREBASE_SERVICE_ACCOUNT_BASE64`/`ALGOLIA_*`/
`CLOUDINARY_URL` apontando para o projeto de produção (do próprio
computador ou do terminal da hospedagem), dentro de `apps/api`:

```bash
pnpm db:seed:production
pnpm exec tsx scripts/create-admin.ts email-da-dona@exemplo.com "Nome"
```

- `db:seed:production` cria só o **catálogo de demonstração** (marcas,
  categorias, coleções, banners e 24 produtos) para a dona da loja editar,
  excluir e substituir pelo painel. Não cria contas de teste, cupom de
  teste nem avaliações fictícias, e **nunca apaga nada**: num Firestore
  que já tem produto ou pedido, ele aborta.
- `create-admin.ts` mostra uma senha temporária **uma única vez**; a dona
  troca em `/admin/entrar` › "Esqueci minha senha".
- O seed comum (`pnpm db:seed`) apaga pedidos e cria administradores com
  senha pública: ele se recusa a rodar com `NODE_ENV=production`.

## 6. Domínio no Registro.br

No painel do Registro.br: **Domínios › (o domínio) › Configurar endereçamento
› Modo avançado** (zona DNS do próprio Registro.br). A hospedagem informa os
valores exatos ao cadastrar o domínio nela; o formato é este:

| Tipo  | Nome   | Valor                                          |
| ----- | ------ | ---------------------------------------------- |
| A     | (raiz) | IP informado pela hospedagem do **site**       |
| CNAME | `www`  | endereço informado pela hospedagem do **site** |
| CNAME | `api`  | endereço informado pela hospedagem da **API**  |

- A raiz do domínio não aceita CNAME no Registro.br — por isso o registro A.
  Se a hospedagem só fornecer CNAME, usar `www` como endereço principal e
  redirecionar a raiz para ele.
- A troca para o modo avançado e a propagação levam de minutos a algumas
  horas. O certificado HTTPS é emitido pela hospedagem depois que o DNS
  responde.
- Só **depois** do HTTPS funcionando, conferir que `NEXT_PUBLIC_SITE_URL`
  está com `https://` (senão o site é publicado sem HSTS).

### E-mail com o domínio (opcional, depois)

Enquanto o remetente for o Gmail da loja, nada a fazer no DNS. Ao passar a
enviar como `contato@dominio`, o provedor de e-mail fornece registros
SPF/DKIM (tipo TXT/CNAME) para a mesma zona — sem eles as mensagens caem no
spam.

## 7. Conferência depois de publicar

1. `https://api.DOMINIO/v1/health` responde (`checks.firestore: "up"`).
2. Home, catálogo e página de produto abrem com imagens.
3. Buscar/filtrar produtos (marca, cor, tamanho, preço) devolve resultado.
4. Criar uma conta de cliente → chega o e-mail de confirmação.
5. "Esqueci minha senha" → chega o e-mail com o link.
6. Fazer um pedido de teste → QR Code do PIX aparece com "ASN SUPPLY".
7. Entrar em `/admin/entrar` com a conta da dona → enviar uma foto de
   produto pelo painel e conferir que aparece na loja.
8. `/provador` → informar a medida do pé e ver o tamanho indicado.
9. Em `/admin/entrar`, tentar `admin@example.com` → deve **falhar** (a
   conta de demonstração não existe em produção).

## 8. O que muda sozinho ao preencher uma variável

| Variável (API)                           | Efeito                                                          |
| ---------------------------------------- | --------------------------------------------------------------- |
| `TWILIO_ACCOUNT_SID`/`AUTH_TOKEN`/`FROM` | senha por SMS e lembrete "sentimos sua falta"                   |
| `ASN_ANTHROPIC_API_KEY`                  | Provador passa a pedir foto e analisá-la                        |
| `GOOGLE_OAUTH_CLIENT_ID`/`SECRET`        | login com Google (+ `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` no site) |
