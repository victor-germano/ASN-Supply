# Fase 3 — Catálogo, carrinho e pedido: Firestore + Algolia

Documento de design detalhado, escrito **antes** de tocar em código, depois de ler
na íntegra todos os repositórios envolvidos. Complementa (e corrige em um ponto
crítico) o plano geral em `C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md`.

## 1. Descoberta crítica: o plano original tinha uma lacuna transacional

O plano original previa a Fase 3 como "Product + Brand/Category/Collection +
Algolia", deixando Cart/Coupon/Order/Payment para a Fase 6. Lendo
`orders.repository.ts` e `cart.repository.ts` na íntegra, isso **não é seguro**:

- `OrdersRepository.create()` lê `ProductVariant` (`prisma.productVariant.findMany`),
  valida e **decrementa estoque dentro de uma transação** (`tx.productVariant.updateMany`
  condicional), e relê preço/produto no commit (`tx.productVariant.findUniqueOrThrow`).
- `OrdersRepository.cancelByCustomer()` **devolve estoque** (`tx.productVariant.update`).
- `CartRepository` lê `ProductVariant`/`Product` via relação Prisma ao vivo em
  praticamente todo método (`findItemsForUser`, `setItemQuantity`).
- A aplicação de cupom (`redemptionCount`) acontece **na mesma transação** da
  criação do pedido.

Se `Product`/`ProductVariant` saírem do Postgres nesta fase e `Cart`/`Order`/
`Coupon` ficarem esperando até a Fase 6, o checkout fica com estoque e preço
**congelados no instante do corte** — qualquer produto criado ou editado depois
disso no painel (agora só no Firestore) seria invisível pro checkout
(`VARIANT_NOT_FOUND`), e duas compras simultâneas no mesmo par
Postgres-congelado/Firestore-vivo não teriam mais a garantia de
"decremento condicional" que impede vender estoque inexistente.

**Correção**: esta fase passa a cobrir, em um único corte —

> **Product (+ subcoleções) + Brand + Category + Collection + Algolia + Cart +
> Coupon + Order + Payment + agregados do painel admin**

Isso deixa a Fase 3 bem maior e mais arriscada do que o plano original previa,
mas evita o estado intermediário quebrado. A alternativa (escrita dupla
Postgres+Firestore durante um hiato) foi descartada: adiciona um ponto de falha
parcial (gravar no Firestore e falhar no Postgres, ou vice-versa) numa parte do
sistema que já lida com concorrência de estoque — mais risco, não menos. Como
não existe pedido real em produção hoje, um corte atômico maior é mais simples
e mais seguro do que sincronizar dois bancos por semanas.

As fases seguintes do plano original (4: Identidade/Review: 5: periféricos)
continuam como estavam — ver seção 6 sobre o que precisa de um ajuste cirúrgico
nelas por causa deste corte.

## 2. Auditoria completa de quem referencia `Product`/`ProductVariant`

| Consumidor                                                    | Tipo de acoplamento                                                                     | Fica nesta fase?                                      | Ação                                                                                                                               |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `products.repository.ts` (leitura PLP/PDP)                    | Join Prisma direto                                                                      | **Sim**                                               | Reescrito — Firestore + Algolia                                                                                                    |
| `admin-products.repository.ts` (escrita)                      | Prisma direto                                                                           | **Sim**                                               | Reescrito — escritor único do Algolia                                                                                              |
| `admin-catalog/{brands,categories,collections}.repository.ts` | Prisma direto                                                                           | **Sim**                                               | Reescrito                                                                                                                          |
| `catalog/{brands,categories,collections}.repository.ts`       | Prisma direto                                                                           | **Sim**                                               | Reescrito                                                                                                                          |
| `cart.repository.ts`                                          | Relação Prisma ao vivo (preço/estoque)                                                  | **Sim**                                               | Reescrito — lê variante do Firestore                                                                                               |
| `coupons.service.ts` (preview)                                | Mesmo registro usado na transação do pedido                                             | **Sim**                                               | Reescrito                                                                                                                          |
| `orders.repository.ts`                                        | Transação de estoque + cupom                                                            | **Sim**                                               | Reescrito — `runTransaction` do Firestore                                                                                          |
| `admin-dashboard.repository.ts`                               | `order.aggregate` + `product.count`                                                     | **Sim**                                               | Reescrito (já mistura os dois)                                                                                                     |
| `catalog/questions/questions.repository.ts`                   | FK Postgres + é subcoleção do Product no design                                         | **Sim**                                               | Migra junto (subcoleção `products/{slug}/questions`)                                                                               |
| `catalog/reviews/reviews.repository.ts`                       | FK Postgres (`onDelete: Cascade`) + escreve `averageRating`/`reviewCount` no Product    | **Não** (CRUD fica Postgres até a Fase 4)             | Ver seção 6 — ajuste cirúrgico                                                                                                     |
| `recovery/activity.controller.ts`                             | FK Postgres (`onDelete: Cascade`)                                                       | **Não** (CustomerActivity fica Postgres até a Fase 5) | Ver seção 6                                                                                                                        |
| `wishlist/wishlist.repository.ts`                             | FK Postgres (`onDelete: Cascade`)                                                       | **Não** (Wishlist fica Postgres até a Fase 5)         | Ver seção 6                                                                                                                        |
| `addresses.repository.ts`                                     | Nenhum (Order só lê endereço pra copiar os campos `shipping*`, não mantém relação viva) | Fica Postgres                                         | Nenhuma mudança — `OrdersRepository` (agora Firestore) continua chamando `AddressesRepository` (Postgres) só na criação, como hoje |

## 3. Layout de coleções Firestore

```
brands/{slug}
categories/{slug}                 — parentId guarda o SLUG do pai
collections/{slug}
products/{slug}
  ├─ images/{autoId}
  ├─ variants/{colorSlug_sizeSlug}
  ├─ lookItems/{autoId}
  └─ questions/{autoId}
carts/{userId}
  └─ items/{productSlug_variantId}
coupons/{codeNormalizado}
orders/{autoId}                   — id opaco, NÃO o code (ver correção da Fase 1/2)
  └─ items/{autoId}
orderCodes/{code}                 — trava de unicidade → { orderId }
payments/{orderId}
```

`Product` guarda um snapshot denormalizado de marca/categoria/coleção
(`brand: {slug, name}`, `category: {slug, name}`, `collection: {slug, name} | null`)
— é o que permite `ProductsRepository` responder a PDP/PLP com uma leitura só,
sem join, e é também o motivo de `AdminBrandsRepository.update()` precisar
re-propagar o nome pros produtos que referenciam aquela marca (ver seção 5.3).

## 4. Algolia

- Um índice `products`, `objectID = slug`. Só produtos `isPublished: true`.
- Réplicas de ordenação: `products_price_asc`, `products_price_desc`,
  `products_best_selling`, `products_top_rated`, `products_newest`.
- Atributos indexados: `name`, `description`, `brand.name` (busca textual);
  facetados: `brand.slug`, `category.slug`, `collection.slug`, `gender`,
  `colors.name`, `sizes`, `priceInCents` (numérico, range).
- `AdminProductsRepository` é o único escritor: todo `create`/`update`/`delete`
  espelha no Algolia depois do Firestore confirmar (Firestore é a fonte da
  verdade; se o espelhamento falhar, loga e segue — um `reindex` script corrige
  divergência, não trava o painel).
- `ProductsRepository.search()`/`getFacets()` viram wrappers finos sobre a API
  de busca do Algolia; `findBySlug`, `findRelated`, `findByIds`,
  `findCatalogSummaryForAi`, `findLookItems` continuam lendo direto do
  Firestore (leituras simples, sem texto nem facetas).

## 5. Pontos de maior risco — desenho detalhado

### 5.1 Criação de pedido (`OrdersRepository.create`)

Tradução direta da transação Postgres atual para `runTransaction` do Firestore,
preservando a mesma garantia (ver `getFirestore().runTransaction`, sempre
serializável com retry automático em contenção):

1. Dentro da transação: `tx.get()` de cada `products/{slug}/variants/{id}`
   necessário (os `variantId` recebidos do client já precisam vir como
   `${productSlug}/{colorSlug_sizeSlug}` ou equivalente — o client manda
   `productSlug` + `variantId` pro repositório montar o caminho).
2. Checar `stockQuantity >= quantity` **em memória** (a leitura dentro da
   transação já garante que, se outra transação decrementar o estoque entre a
   leitura e o commit, o Firestore aborta e tenta de novo sozinho — não precisa
   do padrão "decremento condicional + recontagem" que o Postgres exigia).
3. `tx.update(variantRef, { stockQuantity: FieldValue.increment(-quantity) })`.
4. Reler `products/{slug}` pra pegar preço vigente (mesmo espírito do
   `findUniqueOrThrow` de repreç. atual).
5. Cupom: `tx.get(coupons/{code})`, validar, `tx.update(couponRef, { redemptionCount: FieldValue.increment(1) })`
   condicionado a `redemptionCount < maxRedemptions` checado em memória (a
   mesma leitura-antes-de-escrever da transação cobre a corrida).
6. `tx.set(orderRef, {...})` + `tx.set(orderCodeRef, {orderId})` — `orderCodeRef`
   é `orderCodes/{code}`; se já existir, a transação lança e o retry de fora
   (`createWithRetry`, preservado) tenta outro código.
7. Itens do pedido em subcoleção `orders/{id}/items/{autoId}` (mesma transação).

### 5.2 Cancelamento (`cancelByCustomer`)

Espelho do create: ler pedido + itens, `tx.update(variantRef, {stockQuantity: FieldValue.increment(quantity)})`
pra cada item com `variantId` não nulo, `tx.update(couponRef, {redemptionCount: FieldValue.increment(-1)})`
se houver cupom, `tx.update(orderRef, {status: 'CANCELLED'})`.

### 5.3 Edição de marca/categoria/coleção propaga pro snapshot do produto

Diferente do Postgres (onde o join é sempre ao vivo), o Firestore denormaliza
nome da marca dentro de cada `Product`. `AdminBrandsRepository.update()`
precisa, na mesma operação, atualizar `brand.name` em todo produto daquela
marca — Firestore não tem `UPDATE ... WHERE` em lote nativo, então isso é um
`db.collection('products').where('brand.slug','==',slug).get()` seguido de um
`WriteBatch` (lotes de até 500 — o catálogo de demonstração tem 24 produtos,
então nunca passa de 1 lote). Mesmo mecanismo pra `Category`/`Collection`.

### 5.4 Reconciliação de variantes no `AdminProductsRepository.update`

A lógica atual (casar variantes recebidas com as existentes por `colorName+size`,
atualizar as que continuam, criar as novas, apagar as removidas, **preservando
o id** das que continuam) é ainda mais natural no Firestore: o id da variante
JÁ é `${colorSlug}_${sizeSlug}` (determinístico), então "preservar o id" é
automático — `tx.set(variantRef, data, {merge:true})` com a mesma chave
sempre atualiza a mesma variante, sem precisar casar nada manualmente. As que
saíram do payload recebido precisam de um `delete` explícito (ainda é preciso
comparar o conjunto recebido com o existente pra saber quais apagar).

### 5.5 Ciclo de categoria (`assertNotSelfOrDescendant`)

Mesma lógica, trocando `prisma.category.findUnique` por
`db.collection('categories').doc(id).get()` — `id` aqui já é o slug.

## 6. Ajuste cirúrgico em Wishlist / Review / CustomerActivity

Estes três módulos **não migram** nesta fase (ficam nas Fases 4/5 do plano
original), mas têm uma FK Postgres real (`onDelete: Cascade`) para
`Product.id`. Depois que `Product` sair do Postgres, essa FK vira uma
referência para uma tabela congelada (nenhum produto novo entra nela) —
qualquer avaliação, pergunta de atividade ou wishlist sobre um produto criado
**depois** do corte da Fase 3 quebraria com violação de FK.

Correção mínima, sem puxar essas três coleções inteiras pra esta fase:

1. Migração Prisma removendo a constraint de FK (`@relation`) de
   `WishlistItem.productId`, `Review.productId`, `CustomerActivity.productId`
   — viram `String` solto, exatamente como `OrderItem.productId` já é hoje
   (opcional, sem relação obrigatória).
2. Trocar a checagem de existência (`prisma.product.findUnique`/`findFirst`)
   nesses três lugares por uma checagem no Firestore
   (`FirestoreService.db.collection('products').doc(slug).get()`), já que é
   a nova fonte da verdade.
3. `dto.productId` que essas rotas recebem passa a ser o **slug** do produto
   (não mais o cuid) — consistente com o novo id do `Product` no Firestore.
   Isso é uma mudança de contrato pequena (o `id` que `ProductSummary`/
   `ProductDetail` devolvem pro client já vira o slug nesta fase, então o
   client já manda o valor certo sem precisar de nenhuma mudança própria).

Ponto de atenção: `Review.productId`/`CustomerActivity.productId` nunca tiveram
dado real além do seed de demonstração — não há migração de dado a fazer,
só a troca do tipo da coluna.

## 7. Seed

`prisma/seed.ts` continua gerando o catálogo de demonstração, mas a parte de
Brand/Category/Collection/Product passa a escrever no Firestore (+ indexar no
Algolia) em vez de `prisma.brand.create`/etc. — mesmo conteúdo fictício de
hoje (marcas inventadas, arte própria em vez de foto de terceiro), só o
destino muda. `resetCatalogData()` troca `deleteMany()` por apagar as
coleções Firestore equivalentes antes de recriar.

## 8. Ordem de execução (dentro desta fase, da menor pra maior risco)

1. `Brand`/`Category`/`Collection` (CRUD simples, sem transação) — admin +
   catálogo, 6 arquivos.
2. `Product` + subcoleções + integração Algolia (o maior bloco) — leitura
   (`products.repository.ts`) e escrita (`admin-products.repository.ts`).
3. Seed adaptado — roda contra o Firestore real antes de seguir, pra ter dado
   pra testar os próximos itens.
4. `Cart`.
5. `Coupon` (preview).
6. `Order` + `Payment` + agregados do painel admin — o bloco mais arriscado,
   por último, com o catálogo e o carrinho já validados por baixo dele.
7. Ajuste cirúrgico em Wishlist/Review/CustomerActivity (seção 6).
8. Teste de ponta a ponta local (igual às Fases 1/2): subir a API local
   apontando pro Firestore real, exercitar PLP/PDP/filtros, carrinho, cupom,
   fechar um pedido de teste, cancelar, conferir que o estoque volta, e
   testar duas requisições concorrentes no último item de estoque.

## 9. O que NÃO muda nesta fase

`User`/`Auth`/`Address`/`PasswordResetCode` continuam 100% Postgres — Order só
lê `Address` uma vez (snapshot na criação, sem relação viva depois), então não
há acoplamento transacional ali. `StoredImage` já foi resolvido pelo Cloudinary
nas Fases 1/2. `TryOn`, `RecoveryMessage`, `Newsletter`/`Banner`/`SocialPost`
(já migrados) não têm nenhuma relação com Product/Order.
