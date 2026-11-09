# Revisão de segurança e estrutura — migração Postgres → Firestore

Checkpoint antes de começar a Fase 2 da migração (ver plano completo em
`C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md`). Cobre o que foi
verificado até a Fase 1 (Fundação) e o que precisa ficar de olho nas fases
seguintes.

## 1. Segredos e credenciais

| Segredo                                                          | Onde mora                                       | Verificado                                                                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT_BASE64`                                | Só no Railway (env var do serviço `ASN-Supply`) | ✅ Nunca gravado em arquivo do repositório — foi lido do JSON baixado, convertido em memória e o arquivo temporário apagado logo em seguida |
| `ALGOLIA_ADMIN_API_KEY`                                          | Só no Railway                                   | ✅ Mesma origem (colado direto na variável)                                                                                                 |
| `CLOUDINARY_URL`                                                 | Só no Railway                                   | ✅ Extraída do painel do Cloudinary, nunca escrita em arquivo                                                                               |
| `DATABASE_URL`, `JWT_SECRET`, `INTERNAL_API_KEY` (já existentes) | Só no Railway                                   | ✅ Sem alteração nesta migração                                                                                                             |

Confirmado por `git grep` e pela leitura do `.gitignore`/`.dockerignore`:

- `.gitignore` cobre `.env`, `.env.*` (exceto `.env.example`) — nenhum segredo real é versionado.
- `.dockerignore` também exclui `.env*`, então a imagem de produção nunca embute segredo via contexto de build.
- Nenhuma ocorrência de chave privada ou valor de `FIREBASE_SERVICE_ACCOUNT_BASE64` nos arquivos rastreados pelo Git.
- `apps/api/src/config/firebase-admin.ts` (novo) só lê a credencial de variáveis de ambiente (`process.env`) — nunca de um arquivo dentro do repositório, nem em dev nem em produção. O caminho `GOOGLE_APPLICATION_CREDENTIALS` (dev local) aponta para um arquivo fora do repo, nunca comitado.

**Regra a manter durante toda a migração**: nenhum arquivo `.json` de service account, nem o valor em base64, é escrito dentro da pasta do projeto em nenhum momento — só em variáveis de ambiente do Railway ou, localmente, em `.env` (já ignorado pelo Git).

## 2. Modelo de segurança do Firestore

Decisão já tomada no plano: **só o backend NestJS fala com o Firestore**, via Admin SDK (a credencial de service account ignora Security Rules por completo). O site Next.js nunca recebe uma config de cliente Firebase nem acessa o banco diretamente.

Consequência direta: toda a autorização (quem pode ler/escrever o quê) continua 100% no código do NestJS — `RolesGuard`, checagem de dono do recurso (`userId` do JWT vs. documento), etc. — exatamente como já funciona hoje com o Prisma. A migração **não** introduz um novo ponto de controle de acesso; ela só troca o driver de persistência atrás da mesma camada de autorização.

**Ação pendente do seu lado** (não dá pra automatizar — fica no Firebase Console, aba **Regras** do Firestore): confirmar que as regras estão travadas, não liberadas. Se o banco foi criado em "modo produção" (como te orientei), o padrão já deve ser este, mas vale colar isto explicitamente para não depender do padrão mudar no futuro:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Isso é defesa em profundidade: mesmo que uma chave de API do Firebase para o lado cliente vaze um dia (não existe hoje, mas por precaução), ninguém consegue ler ou escrever nada sem passar pelo Admin SDK do servidor.

## 3. Por que a estrutura do projeto torna essa migração segura de fazer em fases

O acesso ao Postgres já está isolado atrás de **20 arquivos `*.repository.ts`**, um por módulo (`apps/api/src/modules/**`). Services e controllers nunca chamam o Prisma diretamente — só os métodos da interface do repositório. Isso foi confirmado por uma pesquisa dedicada no início do planejamento desta migração.

Efeito prático: trocar a implementação por trás de um repositório (Prisma → Firestore) não muda nada no contrato visível para o resto da aplicação. Cada fase do plano mexe em um grupo pequeno e isolado de repositórios, o app continua deployável depois de cada fase, e um bug introduzido numa fase não tem como vazar silenciosamente para módulos que ainda não foram tocados — o TypeScript (tipagem da interface) e os testes existentes do módulo pegam isso.

Novo código já adicionado nesta Fase 1 (tudo inerte, não registrado em `app.module.ts` ainda, então não roda em produção):

- `apps/api/src/config/firebase-admin.ts` — inicializador único do Admin SDK, reusado por Nest e por scripts standalone.
- `apps/api/src/modules/firestore/` (`firestore.module.ts`, `firestore.service.ts`) — provider Nest, mesmo padrão do `PrismaModule` existente.
- `apps/api/src/config/env.validation.ts` — novas variáveis, todas `.optional()` por enquanto (não derrubam o boot se ausentes).

## 4. O que muda a partir da Fase 2

A Fase 2 troca os repositórios de **Brand, Category, Collection, Banner, SocialPost, NewsletterSubscriber** (coleções simples, sem transação) de Prisma para Firestore. Riscos específicos desta fase:

- São os repositórios mais simples do sistema (sem transação, sem concorrência) — menor superfície de erro para começar.
- `Category.parentId` passa a guardar o **slug** do pai em vez do `cuid` — qualquer lugar que compare esse campo por igualdade continua funcionando, mas é um ponto a testar manualmente (árvore de categorias no painel admin e no site).
- Enquanto a Fase 2 roda, o restante do app (produtos, carrinho, pedidos, autenticação) continua 100% no Postgres — nenhuma dependência cruzada entre essas coleções e o resto.

## 5. Plano de rollback por fase

Como cada fase troca só um grupo de repositórios por trás da mesma interface, reverter uma fase é reverter o commit/deploy daquela fase — o Postgres continua existindo e intacto até a Fase 8 (descomissionamento), então não há perda de dado possível por reverter uma fase migrada: os dados "voltam a existir" porque nunca deixaram de existir lá.
