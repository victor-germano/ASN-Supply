/**
 * Seed de demonstração do catálogo ASN Supply.
 *
 * Marcas e produtos são FICTÍCIOS por design: usar marcas registradas reais
 * (Nike, Adidas etc.) em listagens de produto seria uma questão de marca
 * registrada, mesmo em ambiente de demonstração — a inspiração visual do
 * projeto não se traduz em vender produtos de terceiros no seed.
 *
 * Imagens: composições SVG abstratas próprias (public/seed-art em
 * apps/web), não fotografia de terceiros. A primeira tentativa usou fotos
 * de estoque do Unsplash filtradas por "sneakers" — na prática, a esmagadora
 * maioria do resultado eram produtos Nike reais com logo/wordmark visível,
 * o que criaria confusão de marca com o catálogo fictício. Substituído por
 * arte própria até existir fotografia de produto licenciada de verdade.
 *
 * Este script é destrutivo por design (apaga e recria o conteúdo de
 * catálogo) — pensado para bancos de desenvolvimento/demonstração, nunca
 * para produção.
 */
import bcrypt from 'bcryptjs';
import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from '../src/config/firebase-admin';
import { AlgoliaService, type AlgoliaProductRecord } from '../src/modules/algolia/algolia.service';

const db = getDb();
// `AlgoliaService` não depende de DI do Nest (só lê env var no construtor)
// — reaproveitado direto aqui, fora do contexto do Nest, como os outros
// scripts standalone já fazem com `getDb()`.
const algolia = new AlgoliaService();

// Mesmo custo usado em `AuthService` (`BCRYPT_ROUNDS`) — não importado
// direto porque o seed não depende do resto da API, só do Prisma.
const BCRYPT_ROUNDS = 12;

/**
 * Conta admin fixa (`@example.com`, mesmo domínio limpo por
 * `resetCatalogData` a cada rodada) e um cupom sempre válido — sem eles,
 * os testes e2e de painel admin (CRUD de catálogo, gestão de clientes,
 * rastreio) e de cupom no checkout não têm como rodar sem promover um
 * usuário manualmente. `scripts/promote-to-admin.ts` continua sendo o
 * único caminho pra promover uma conta de verdade fora deste seed.
 */
const E2E_ADMIN_EMAIL = 'e2e.admin@example.com';
const E2E_ADMIN_PASSWORD = 'SenhaAdminE2E123!';
const E2E_COUPON_CODE = 'E2E10';

/**
 * Admin de DEMONSTRAÇÃO, para explorar o painel à mão — separado do admin
 * de e2e de propósito (os testes trocam a senha daquele no fluxo de
 * "esqueci a senha"). `@example.com`: domínio reservado pra exemplos (nunca
 * é de ninguém) e limpo/recriado a cada `db:seed`, como o resto dos dados
 * fictícios. Nunca criado em produção (ver `assertSafeToSeed`).
 */
const DEMO_ADMIN_EMAIL = 'admin@example.com';
const DEMO_ADMIN_PASSWORD = 'AsnAdmin2026!';

/** Avaliadores fictícios (sem senha — nunca logam, só assinam reviews de demonstração). */
const REVIEWER_SEEDS = [
  { name: 'Marina Costa', email: 'marina.costa@example.com' },
  { name: 'Rafael Andrade', email: 'rafael.andrade@example.com' },
  { name: 'Juliana Prado', email: 'juliana.prado@example.com' },
  { name: 'Lucas Ferreira', email: 'lucas.ferreira@example.com' },
  { name: 'Beatriz Nunes', email: 'beatriz.nunes@example.com' },
  { name: 'Thiago Mendes', email: 'thiago.mendes@example.com' },
  { name: 'Camila Rocha', email: 'camila.rocha@example.com' },
  { name: 'Diego Salles', email: 'diego.salles@example.com' },
];

/** Todo e-mail de conta fictícia que este seed cria — usado por `resetCatalogData` para limpar só essas, nunca a coleção `users` inteira. */
const ALL_DEMO_EMAILS = [E2E_ADMIN_EMAIL, DEMO_ADMIN_EMAIL, ...REVIEWER_SEEDS.map((r) => r.email)];

/** Pool de composições abstratas próprias (public/seed-art/art-01.svg .. art-08.svg em apps/web). */
const ART_COUNT = 8;

function art(index: number): string {
  const n = (index % ART_COUNT) + 1;
  return `/seed-art/art-${String(n).padStart(2, '0')}.svg`;
}

/** Apaga todos os documentos de uma coleção (sem recursão pras subcoleções — cada chamador já sabe quais subcoleções tem e as apaga à parte). */
async function deleteAllDocs(ref: FirebaseFirestore.CollectionReference): Promise<void> {
  const snapshot = await ref.get();
  if (snapshot.empty) return;
  const batches: FirebaseFirestore.WriteBatch[] = [];
  let batch = db.batch();
  snapshot.docs.forEach((doc, index) => {
    batch.delete(doc.ref);
    if ((index + 1) % 450 === 0) {
      batches.push(batch);
      batch = db.batch();
    }
  });
  batches.push(batch);
  await Promise.all(batches.map((b) => b.commit()));
}

/** Apaga um documento + todas as subcoleções nomeadas (produtos têm 5: images, variants, lookItems, questions, reviews). */
async function deleteDocsWithSubcollections(
  collectionName: string,
  subcollectionNames: string[],
): Promise<void> {
  const snapshot = await db.collection(collectionName).get();
  for (const doc of snapshot.docs) {
    for (const sub of subcollectionNames) {
      await deleteAllDocs(doc.ref.collection(sub));
    }
  }
  await deleteAllDocs(db.collection(collectionName));
}

/**
 * Apaga só UMA conta de demonstração (doc + endereços + trava de e-mail) —
 * nunca a coleção `users` inteira, que desde a Fase 4 também guarda contas
 * reais de clientes de verdade. Resolvida pela trava `userEmails` (mesmo
 * caminho de `UsersRepository.findByEmail`); e-mail sem trava = conta nunca
 * existiu ou já foi apagada, no-op.
 */
async function deleteDemoUser(email: string): Promise<void> {
  const emailLockRef = db.collection('userEmails').doc(email);
  const lockSnap = await emailLockRef.get();
  if (!lockSnap.exists) return;

  const userId = (lockSnap.data() as { userId: string }).userId;
  const userRef = db.collection('users').doc(userId);
  await deleteAllDocs(userRef.collection('addresses'));
  await Promise.all([userRef.delete(), emailLockRef.delete()]);
}

/**
 * Favoritos de TODOS os usuários — `WishlistItem` migrou pro Firestore na
 * Fase 5, subcoleção `users/{id}/wishlist`. Diferente de `deleteDemoUser`
 * (que só apaga contas fictícias por e-mail), aqui o alvo é mesmo "zerar o
 * favorito de todo mundo", inclusive de conta real — só seguro porque
 * `db:seed` (ao contrário de `db:seed:production`) é uma ferramenta de
 * pré-lançamento: depois que a loja tiver clientes de verdade, não se roda
 * mais (ver `assertSafeToSeed`).
 */
async function resetAllWishlists(): Promise<void> {
  const usersSnapshot = await db.collection('users').get();
  await Promise.all(
    usersSnapshot.docs.map((user) => deleteAllDocs(user.ref.collection('wishlist'))),
  );
}

async function resetCatalogData(): Promise<void> {
  // Contas de demonstração (admins de e2e + avaliadores fictícios) —
  // reseedadas a cada rodada junto com o que elas referenciam.
  await Promise.all(ALL_DEMO_EMAILS.map((email) => deleteDemoUser(email)));
  await resetAllWishlists();

  // Firestore — catálogo (+ reviews, migradas pro Firestore na Fase 4),
  // carrinho, pedido e cupom.
  await deleteDocsWithSubcollections('products', [
    'images',
    'variants',
    'lookItems',
    'questions',
    'reviews',
  ]);
  await deleteAllDocs(db.collection('brands'));
  await deleteAllDocs(db.collection('categories'));
  await deleteAllDocs(db.collection('collections'));
  await deleteDocsWithSubcollections('orders', ['items']);
  await deleteAllDocs(db.collection('orderCodes'));
  await deleteDocsWithSubcollections('carts', ['items']);
  // Só o cupom fixo de e2e — nunca apagar a coleção inteira, que poderia
  // conter cupons reais criados fora deste script.
  await db.collection('coupons').doc(E2E_COUPON_CODE).delete();
  await deleteAllDocs(db.collection('banners'));
  await deleteAllDocs(db.collection('socialPosts'));
}

/** Cria uma conta (User migrou pro Firestore na Fase 4 — mesma trava `userEmails` de `UsersRepository.create`). */
async function seedUser(data: {
  name: string;
  email: string;
  passwordHash: string | null;
  role: 'CUSTOMER' | 'ADMIN';
}): Promise<string> {
  const userRef = db.collection('users').doc();
  const now = Timestamp.now();
  await db.runTransaction(async (tx) => {
    tx.set(db.collection('userEmails').doc(data.email), { userId: userRef.id });
    tx.set(userRef, {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      avatarUrl: null,
      googleId: null,
      appleId: null,
      emailVerifiedAt: now,
      phone: null,
      marketingOptIn: false,
      marketingOptInAt: null,
      termsAcceptedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  });
  return userRef.id;
}

/** Contas admin (e2e e demonstração) + cupom fixos — ver comentários no topo do arquivo. */
async function seedE2EFixtures(): Promise<void> {
  await seedUser({
    name: 'Admin E2E',
    email: E2E_ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(E2E_ADMIN_PASSWORD, BCRYPT_ROUNDS),
    role: 'ADMIN',
  });
  await db.collection('coupons').doc(E2E_COUPON_CODE).set({
    code: E2E_COUPON_CODE,
    percentageOff: 10,
    amountOffInCents: null,
    minOrderInCents: null,
    expiresAt: null,
    maxRedemptions: null,
    redemptionCount: 0,
    isActive: true,
  });
  await seedUser({
    name: 'Administração ASN (demo)',
    email: DEMO_ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(DEMO_ADMIN_PASSWORD, BCRYPT_ROUNDS),
    role: 'ADMIN',
  });
}

async function seedBrands() {
  const brands = [
    { name: 'Nova Court', slug: 'nova-court' },
    { name: 'Terra Runner', slug: 'terra-runner' },
    { name: 'Aster Studio', slug: 'aster-studio' },
    { name: 'Marrow Atelier', slug: 'marrow-atelier' },
  ];
  await Promise.all(
    brands.map((brand) =>
      db
        .collection('brands')
        .doc(brand.slug)
        .set({ ...brand, logoUrl: null }),
    ),
  );
  return brands;
}

async function seedCategories() {
  const categories = [
    {
      name: 'Casual',
      slug: 'casual',
      parentId: null,
      imageUrl: art(0),
      imageAlt: 'Tênis casual off-white sobre fundo neutro',
    },
    {
      name: 'Corrida',
      slug: 'corrida',
      parentId: null,
      imageUrl: art(11),
      imageAlt: 'Tênis de corrida em ambiente urbano',
    },
    {
      name: 'Skate',
      slug: 'skate',
      parentId: null,
      imageUrl: art(6),
      imageAlt: 'Tênis de skate visto de perfil',
    },
    {
      name: 'Basquete',
      slug: 'basquete',
      parentId: null,
      imageUrl: art(7),
      imageAlt: 'Tênis de cano alto para basquete',
    },
  ];
  await Promise.all(
    categories.map((category) => db.collection('categories').doc(category.slug).set(category)),
  );
  return categories;
}

async function seedCollections() {
  const collections = [
    {
      name: 'Studio 001',
      slug: 'studio-001',
      description:
        'A primeira cápsula da casa: silhuetas limpas, paleta neutra e construção minimalista — pensada para durar além da estação.',
      coverImageUrl: art(0),
      coverImageAlt: 'Composição de tênis Studio 001 em estúdio',
      launchedAt: Timestamp.fromDate(new Date('2026-05-01')),
    },
    {
      name: 'Terra Collection',
      slug: 'terra-collection',
      description:
        'Desenvolvida para performance ao ar livre sem abrir mão de identidade — solados robustos, tons terrosos, acabamento técnico.',
      coverImageUrl: art(11),
      coverImageAlt: 'Tênis de trilha Terra Collection em ambiente externo',
      launchedAt: Timestamp.fromDate(new Date('2026-03-10')),
    },
    {
      name: 'Nightwalk',
      slug: 'nightwalk',
      description:
        'Edição de cano alto em couro premium e detalhes refletivos — feita para a cidade depois que o sol se põe.',
      coverImageUrl: art(13),
      coverImageAlt: 'Tênis de cano alto Nightwalk em cenário urbano noturno',
      launchedAt: Timestamp.fromDate(new Date('2026-07-20')),
    },
  ];
  await Promise.all(
    collections.map((collection) =>
      db.collection('collections').doc(collection.slug).set(collection),
    ),
  );
  return collections;
}

async function seedBanners() {
  const banners = [
    {
      title: 'Nightwalk chegou',
      subtitle: 'Cano alto, couro premium e detalhes refletivos — a nova edição da casa.',
      ctaLabel: 'Ver coleção',
      ctaHref: '/colecoes/nightwalk',
      imageUrlDesktop: art(13),
      imageUrlMobile: art(13),
      position: 0,
      isActive: true,
      startsAt: null,
      endsAt: null,
    },
    {
      title: 'Studio 001',
      subtitle: 'Silhuetas limpas, paleta neutra. A cápsula que abre a temporada.',
      ctaLabel: 'Explorar cápsula',
      ctaHref: '/colecoes/studio-001',
      imageUrlDesktop: art(0),
      imageUrlMobile: art(0),
      position: 1,
      isActive: true,
      startsAt: null,
      endsAt: null,
    },
    {
      title: 'Terra Collection',
      subtitle: 'Performance ao ar livre, identidade urbana.',
      ctaLabel: 'Ver lançamentos',
      ctaHref: '/colecoes/terra-collection',
      imageUrlDesktop: art(11),
      imageUrlMobile: art(11),
      position: 2,
      isActive: true,
      startsAt: null,
      endsAt: null,
    },
  ];
  const batch = db.batch();
  for (const banner of banners) batch.set(db.collection('banners').doc(), banner);
  await batch.commit();
}

async function seedSocialPosts() {
  const batch = db.batch();
  for (let index = 0; index < 6; index += 1) {
    batch.set(db.collection('socialPosts').doc(), {
      imageUrl: art(index + 2),
      permalink: 'https://instagram.com/asnsupply',
      caption: null,
      position: index,
      isActive: true,
    });
  }
  await batch.commit();
}

interface ProductSeed {
  slug: string;
  name: string;
  description: string;
  materials: string[];
  technologies: string[];
  gender: 'MASCULINO' | 'FEMININO' | 'UNISSEX' | 'INFANTIL';
  priceInCents: number;
  compareAtPriceInCents?: number;
  isNewArrival: boolean;
  isBestSeller: boolean;
  brandSlug: string;
  categorySlug: string;
  collectionSlug?: string;
  photoIndex: number;
  hoverPhotoIndex?: number;
  colors: { name: string; hex: string }[];
}

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    slug: 'nova-court-low-off-white',
    name: 'Nova Court Low — Off-White',
    description:
      'O modelo de assinatura da Nova Court: couro nobuck off-white, entressola em EVA de baixa densidade e acabamento costurado à mão.',
    materials: ['Couro nobuck', 'Entressola EVA', 'Palmilha em espuma viscoelástica'],
    technologies: ['NovaFoam™', 'Sola antiderrapante em borracha'],
    gender: 'UNISSEX',
    priceInCents: 89900,
    isNewArrival: true,
    isBestSeller: false,
    brandSlug: 'nova-court',
    categorySlug: 'casual',
    collectionSlug: 'studio-001',
    photoIndex: 0,
    hoverPhotoIndex: 8,
    colors: [
      { name: 'Off-White', hex: '#F0ECE3' },
      { name: 'Preto', hex: '#16160F' },
    ],
  },
  {
    slug: 'nova-court-low-verde-oliva',
    name: 'Nova Court Low — Verde Oliva',
    description:
      'A mesma construção premium da Nova Court Low, em uma paleta verde-oliva que se tornou a assinatura cromática da marca.',
    materials: ['Couro nobuck', 'Entressola EVA', 'Palmilha em espuma viscoelástica'],
    technologies: ['NovaFoam™', 'Sola antiderrapante em borracha'],
    gender: 'UNISSEX',
    priceInCents: 89900,
    isNewArrival: false,
    isBestSeller: true,
    brandSlug: 'nova-court',
    categorySlug: 'casual',
    photoIndex: 3,
    hoverPhotoIndex: 5,
    colors: [
      { name: 'Verde Oliva', hex: '#83815C' },
      { name: 'Areia', hex: '#D7D5BF' },
    ],
  },
  {
    slug: 'nova-court-mid-preto',
    name: 'Nova Court Mid — Preto',
    description:
      'Versão cano médio da Nova Court, em couro liso preto — construção idêntica à Low, com cobertura extra no tornozelo.',
    materials: ['Couro liso', 'Entressola EVA'],
    technologies: ['NovaFoam™'],
    gender: 'UNISSEX',
    priceInCents: 94900,
    isNewArrival: false,
    isBestSeller: false,
    brandSlug: 'nova-court',
    categorySlug: 'casual',
    photoIndex: 6,
    colors: [{ name: 'Preto', hex: '#16160F' }],
  },
  {
    slug: 'terra-runner-trail',
    name: 'Terra Runner Trail',
    description:
      'Desenvolvido para trilha: solado multi-direcional, cabedal impermeável e amortecimento reativo para longas distâncias.',
    materials: ['Mesh respirável', 'Membrana impermeável', 'Solado em borracha Vibram-like'],
    technologies: ['TerraGrip™', 'ReactiveFoam™'],
    gender: 'UNISSEX',
    priceInCents: 79900,
    isNewArrival: true,
    isBestSeller: false,
    brandSlug: 'terra-runner',
    categorySlug: 'corrida',
    collectionSlug: 'terra-collection',
    photoIndex: 11,
    hoverPhotoIndex: 9,
    colors: [
      { name: 'Terracota', hex: '#A3A177' },
      { name: 'Grafite', hex: '#4A4938' },
    ],
  },
  {
    slug: 'terra-runner-speed',
    name: 'Terra Runner Speed',
    description:
      'A versão de asfalto da linha Terra Runner: mais leve, mais responsiva, pensada para ritmo — sem abrir mão do conforto de longa distância.',
    materials: ['Mesh de engenharia', 'Entressola EVA dupla densidade'],
    technologies: ['ReactiveFoam™'],
    gender: 'UNISSEX',
    priceInCents: 74900,
    isNewArrival: false,
    isBestSeller: true,
    brandSlug: 'terra-runner',
    categorySlug: 'corrida',
    photoIndex: 9,
    hoverPhotoIndex: 11,
    colors: [
      { name: 'Branco', hex: '#FFFFFF' },
      { name: 'Verde Oliva', hex: '#83815C' },
    ],
  },
  {
    slug: 'terra-runner-light',
    name: 'Terra Runner Light',
    description:
      'Edição de entrada da linha Terra Runner: mesh leve, amortecimento equilibrado, no preço de porta de entrada da marca.',
    materials: ['Mesh respirável', 'Entressola EVA'],
    technologies: ['TerraGrip™'],
    gender: 'UNISSEX',
    priceInCents: 59900,
    compareAtPriceInCents: 69900,
    isNewArrival: false,
    isBestSeller: false,
    brandSlug: 'terra-runner',
    categorySlug: 'corrida',
    photoIndex: 4,
    colors: [{ name: 'Cinza', hex: '#BEBB99' }],
  },
  {
    slug: 'aster-skate-classic',
    name: 'Aster Skate Classic',
    description:
      'Silhueta baixa vulcanizada, lona reforçada e sola em borracha de alta aderência — feito para durar em pé de skate.',
    materials: ['Lona de algodão reforçada', 'Sola vulcanizada'],
    technologies: ['GripCore™'],
    gender: 'UNISSEX',
    priceInCents: 64900,
    isNewArrival: true,
    isBestSeller: false,
    brandSlug: 'aster-studio',
    categorySlug: 'skate',
    photoIndex: 6,
    hoverPhotoIndex: 2,
    colors: [
      { name: 'Preto', hex: '#16160F' },
      { name: 'Off-White', hex: '#F0ECE3' },
    ],
  },
  {
    slug: 'aster-skate-pro',
    name: 'Aster Skate Pro',
    description:
      'Versão profissional da Aster Skate: entressola reforçada com absorção de impacto e palmilha removível de alta densidade.',
    materials: ['Camurça', 'Sola vulcanizada dupla camada'],
    technologies: ['GripCore™', 'ImpactShield™'],
    gender: 'UNISSEX',
    priceInCents: 69900,
    compareAtPriceInCents: 84900,
    isNewArrival: false,
    isBestSeller: true,
    brandSlug: 'aster-studio',
    categorySlug: 'skate',
    photoIndex: 2,
    hoverPhotoIndex: 6,
    colors: [{ name: 'Grafite', hex: '#4A4938' }],
  },
  {
    slug: 'marrow-high-court',
    name: 'Marrow High Court',
    description:
      'Cano alto em couro premium com entressola de alta absorção de impacto — a peça central da edição Nightwalk.',
    materials: ['Couro premium', 'Entressola de alta densidade', 'Detalhes refletivos'],
    technologies: ['ImpactShield™', 'NightVision™ (refletivo)'],
    gender: 'UNISSEX',
    priceInCents: 109900,
    isNewArrival: true,
    isBestSeller: false,
    brandSlug: 'marrow-atelier',
    categorySlug: 'basquete',
    collectionSlug: 'nightwalk',
    photoIndex: 13,
    hoverPhotoIndex: 7,
    colors: [{ name: 'Preto', hex: '#16160F' }],
  },
  {
    slug: 'marrow-flux',
    name: 'Marrow Flux',
    description:
      'Silhueta de performance para quadra: amortecimento responsivo, cabedal estruturado e suporte lateral reforçado.',
    materials: ['Mesh técnico', 'Overlays em TPU'],
    technologies: ['ImpactShield™', 'FluxPod™'],
    gender: 'UNISSEX',
    priceInCents: 94900,
    isNewArrival: false,
    isBestSeller: true,
    brandSlug: 'marrow-atelier',
    categorySlug: 'basquete',
    photoIndex: 7,
    hoverPhotoIndex: 13,
    colors: [
      { name: 'Branco', hex: '#FFFFFF' },
      { name: 'Preto', hex: '#16160F' },
    ],
  },
  {
    slug: 'nova-court-high-bege',
    name: 'Nova Court High — Bege',
    description:
      'Cano alto da linha Nova Court em camurça bege, forro em lã e cadarço encerado — construção de inverno sem perder a leveza da silhueta original.',
    materials: ['Camurça', 'Forro em lã', 'Entressola EVA'],
    technologies: ['NovaFoam™'],
    gender: 'FEMININO',
    priceInCents: 99900,
    isNewArrival: true,
    isBestSeller: false,
    brandSlug: 'nova-court',
    categorySlug: 'casual',
    photoIndex: 1,
    hoverPhotoIndex: 4,
    colors: [
      { name: 'Bege', hex: '#D7D5BF' },
      { name: 'Preto', hex: '#16160F' },
    ],
  },
  {
    slug: 'nova-court-low-rosa-areia',
    name: 'Nova Court Low — Rosa Areia',
    description:
      'Colorway sazonal da Nova Court Low: couro nobuck rosa areia com detalhes em off-white, mesma construção premium da linha.',
    materials: ['Couro nobuck', 'Entressola EVA'],
    technologies: ['NovaFoam™'],
    gender: 'FEMININO',
    priceInCents: 89900,
    isNewArrival: true,
    isBestSeller: false,
    brandSlug: 'nova-court',
    categorySlug: 'casual',
    photoIndex: 5,
    hoverPhotoIndex: 0,
    colors: [{ name: 'Rosa Areia', hex: '#E6E0D4' }],
  },
  {
    slug: 'nova-court-kids-runner',
    name: 'Nova Court Kids Runner',
    description:
      'Versão infantil da Nova Court: fecho em velcro, entressola mais macia e reforço extra na biqueira para o dia a dia na escola.',
    materials: ['Couro sintético', 'Entressola EVA macia'],
    technologies: ['NovaFoam™ Kids'],
    gender: 'INFANTIL',
    priceInCents: 39900,
    isNewArrival: false,
    isBestSeller: false,
    brandSlug: 'nova-court',
    categorySlug: 'casual',
    photoIndex: 2,
    colors: [
      { name: 'Off-White', hex: '#F0ECE3' },
      { name: 'Verde Oliva', hex: '#83815C' },
    ],
  },
  {
    slug: 'nova-court-low-sale',
    name: 'Nova Court Low — Edição Anterior',
    description:
      'Colorway da temporada passada da Nova Court Low, mesma construção e materiais — preço reduzido para dar lugar às novas cores.',
    materials: ['Couro nobuck', 'Entressola EVA'],
    technologies: ['NovaFoam™'],
    gender: 'UNISSEX',
    priceInCents: 49900,
    compareAtPriceInCents: 79900,
    isNewArrival: false,
    isBestSeller: false,
    brandSlug: 'nova-court',
    categorySlug: 'casual',
    photoIndex: 4,
    hoverPhotoIndex: 2,
    colors: [{ name: 'Cinza', hex: '#BEBB99' }],
  },
  {
    slug: 'terra-runner-pro-masculino',
    name: 'Terra Runner Pro — Masculino',
    description:
      'Ajuste anatômico masculino da linha Pro: entressola de alta densidade e solado com maior área de contato para treinos de longa distância.',
    materials: ['Mesh de engenharia', 'Entressola EVA dupla densidade'],
    technologies: ['ReactiveFoam™', 'TerraGrip™'],
    gender: 'MASCULINO',
    priceInCents: 89900,
    isNewArrival: true,
    isBestSeller: false,
    brandSlug: 'terra-runner',
    categorySlug: 'corrida',
    collectionSlug: 'terra-collection',
    photoIndex: 10,
    hoverPhotoIndex: 12,
    colors: [
      { name: 'Grafite', hex: '#4A4938' },
      { name: 'Verde Oliva', hex: '#83815C' },
    ],
  },
  {
    slug: 'terra-runner-womens-flow',
    name: 'Terra Runner Flow — Feminino',
    description:
      'Ajuste anatômico feminino, cabedal mais flexível e amortecimento calibrado para passadas mais curtas — mesma tecnologia da linha Terra Runner.',
    materials: ['Mesh respirável', 'Entressola EVA'],
    technologies: ['ReactiveFoam™'],
    gender: 'FEMININO',
    priceInCents: 79900,
    isNewArrival: true,
    isBestSeller: false,
    brandSlug: 'terra-runner',
    categorySlug: 'corrida',
    photoIndex: 12,
    hoverPhotoIndex: 10,
    colors: [
      { name: 'Terracota', hex: '#A3A177' },
      { name: 'Branco', hex: '#FFFFFF' },
    ],
  },
  {
    slug: 'terra-runner-ultra',
    name: 'Terra Runner Ultra',
    description:
      'Topo de linha da Terra Runner: placa de fibra de carbono, espuma de altíssimo retorno de energia e solado desenvolvido para prova.',
    materials: ['Mesh de engenharia', 'Placa de fibra de carbono', 'Espuma PEBA'],
    technologies: ['ReactiveFoam™ Pro', 'CarbonPlate™'],
    gender: 'UNISSEX',
    priceInCents: 99900,
    isNewArrival: false,
    isBestSeller: true,
    brandSlug: 'terra-runner',
    categorySlug: 'corrida',
    collectionSlug: 'terra-collection',
    photoIndex: 9,
    hoverPhotoIndex: 4,
    colors: [
      { name: 'Branco', hex: '#FFFFFF' },
      { name: 'Preto', hex: '#16160F' },
    ],
  },
  {
    slug: 'aster-skate-low-feminino',
    name: 'Aster Skate Low — Feminino',
    description:
      'Modelagem feminina da Aster Skate Classic: lona reforçada, sola vulcanizada e caimento mais estreito no calcanhar.',
    materials: ['Lona de algodão reforçada', 'Sola vulcanizada'],
    technologies: ['GripCore™'],
    gender: 'FEMININO',
    priceInCents: 59900,
    isNewArrival: false,
    isBestSeller: false,
    brandSlug: 'aster-studio',
    categorySlug: 'skate',
    photoIndex: 3,
    hoverPhotoIndex: 1,
    colors: [
      { name: 'Rosa Areia', hex: '#E6E0D4' },
      { name: 'Preto', hex: '#16160F' },
    ],
  },
  {
    slug: 'aster-skate-high-masculino',
    name: 'Aster Skate High — Masculino',
    description:
      'Versão cano alto da Aster Skate: proteção extra de tornozelo para quem passa o dia todo em pé de skate.',
    materials: ['Lona de algodão reforçada', 'Sola vulcanizada dupla camada'],
    technologies: ['GripCore™', 'ImpactShield™'],
    gender: 'MASCULINO',
    priceInCents: 74900,
    isNewArrival: false,
    isBestSeller: false,
    brandSlug: 'aster-studio',
    categorySlug: 'skate',
    photoIndex: 1,
    hoverPhotoIndex: 3,
    colors: [{ name: 'Grafite', hex: '#4A4938' }],
  },
  {
    slug: 'aster-skate-kids',
    name: 'Aster Skate Kids',
    description:
      'Versão infantil da Aster Skate Classic — mesma silhueta, cadarço elástico sem laço e sola levemente mais macia.',
    materials: ['Lona de algodão', 'Sola vulcanizada'],
    technologies: ['GripCore™ Kids'],
    gender: 'INFANTIL',
    priceInCents: 34900,
    isNewArrival: false,
    isBestSeller: false,
    brandSlug: 'aster-studio',
    categorySlug: 'skate',
    photoIndex: 5,
    colors: [
      { name: 'Off-White', hex: '#F0ECE3' },
      { name: 'Verde Oliva', hex: '#83815C' },
    ],
  },
  {
    slug: 'marrow-court-masculino',
    name: 'Marrow Court — Masculino',
    description:
      'Ajuste anatômico masculino da linha de quadra: cabedal mais estruturado e suporte lateral reforçado para mudanças de direção.',
    materials: ['Couro premium', 'Entressola de alta densidade'],
    technologies: ['ImpactShield™'],
    gender: 'MASCULINO',
    priceInCents: 104900,
    isNewArrival: false,
    isBestSeller: false,
    brandSlug: 'marrow-atelier',
    categorySlug: 'basquete',
    photoIndex: 8,
    hoverPhotoIndex: 6,
    colors: [
      { name: 'Preto', hex: '#16160F' },
      { name: 'Grafite', hex: '#4A4938' },
    ],
  },
  {
    slug: 'marrow-elite-feminino',
    name: 'Marrow Elite — Feminino',
    description:
      'Ajuste anatômico feminino da linha de quadra, cabedal em mesh técnico com overlays em TPU para suporte sem peso extra.',
    materials: ['Mesh técnico', 'Overlays em TPU'],
    technologies: ['ImpactShield™', 'FluxPod™'],
    gender: 'FEMININO',
    priceInCents: 99900,
    isNewArrival: true,
    isBestSeller: false,
    brandSlug: 'marrow-atelier',
    categorySlug: 'basquete',
    photoIndex: 6,
    hoverPhotoIndex: 8,
    colors: [
      { name: 'Branco', hex: '#FFFFFF' },
      { name: 'Rosa Areia', hex: '#E6E0D4' },
    ],
  },
  {
    slug: 'marrow-junior',
    name: 'Marrow Junior',
    description:
      'Versão infantil da linha de quadra Marrow: cano médio, fecho em velcro duplo e amortecimento calibrado para o peso de crianças.',
    materials: ['Mesh técnico', 'Entressola EVA macia'],
    technologies: ['FluxPod™ Kids'],
    gender: 'INFANTIL',
    priceInCents: 44900,
    isNewArrival: false,
    isBestSeller: false,
    brandSlug: 'marrow-atelier',
    categorySlug: 'basquete',
    photoIndex: 0,
    colors: [{ name: 'Preto', hex: '#16160F' }],
  },
  {
    slug: 'marrow-atelier-edicao-especial',
    name: 'Marrow Atelier — Edição Especial',
    description:
      'Peça de tiragem limitada em parceria com a cápsula Nightwalk: couro premium curtido a vegetal, ferragens em metal escovado e numeração individual na palmilha.',
    materials: [
      'Couro premium curtido a vegetal',
      'Entressola de alta densidade',
      'Ferragens em metal escovado',
    ],
    technologies: ['ImpactShield™', 'NightVision™ (refletivo)'],
    gender: 'UNISSEX',
    priceInCents: 129900,
    isNewArrival: true,
    isBestSeller: false,
    brandSlug: 'marrow-atelier',
    categorySlug: 'basquete',
    collectionSlug: 'nightwalk',
    photoIndex: 13,
    hoverPhotoIndex: 6,
    colors: [{ name: 'Preto', hex: '#16160F' }],
  },
];

const SIZES = ['38', '39', '40', '41', '42', '43', '44'];

/** Slug do produto que ganha uma sequência de giro 360° de demonstração (não temos fotografia rotacionada real ainda). */
const PRODUCT_WITH_360_VIEW = 'marrow-atelier-edicao-especial';

function seedSlugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedProducts(
  brands: Awaited<ReturnType<typeof seedBrands>>,
  categories: Awaited<ReturnType<typeof seedCategories>>,
  collections: Awaited<ReturnType<typeof seedCollections>>,
) {
  const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const collectionBySlug = new Map(collections.map((collection) => [collection.slug, collection]));
  const createdProducts: { id: string; slug: string }[] = [];

  for (const seed of PRODUCT_SEEDS) {
    const brand = brandBySlug.get(seed.brandSlug);
    const category = categoryBySlug.get(seed.categorySlug);
    if (!brand || !category) {
      throw new Error(`Seed inconsistente: marca/categoria não encontrada para ${seed.slug}`);
    }
    const collection = seed.collectionSlug ? collectionBySlug.get(seed.collectionSlug) : undefined;

    const variantsData = seed.colors.flatMap((color) =>
      SIZES.map((size) => ({
        localId: `${seedSlugify(color.name)}_${seedSlugify(size)}`,
        sku: `${seed.slug}-${seedSlugify(color.name)}-${seedSlugify(size)}`,
        size,
        colorName: color.name,
        colorHex: color.hex,
        stockQuantity: 5 + Math.floor(Math.random() * 20),
        priceOverrideInCents: null as number | null,
      })),
    );

    const imagesData = [
      {
        url: art(seed.photoIndex),
        alt: `${seed.name} — vista principal`,
        width: 1200,
        height: 1500,
        position: 0,
        isHoverImage: false,
        is360Frame: false,
      },
      ...(seed.hoverPhotoIndex !== undefined
        ? [
            {
              url: art(seed.hoverPhotoIndex),
              alt: `${seed.name} — vista alternativa`,
              width: 1200,
              height: 1500,
              position: 1,
              isHoverImage: true,
              is360Frame: false,
            },
          ]
        : []),
    ];

    const has360View = seed.slug === PRODUCT_WITH_360_VIEW;
    const framesData = has360View
      ? Array.from({ length: 8 }, (_, frameIndex) => ({
          url: art(frameIndex),
          alt: `${seed.name} — giro 360°, quadro ${frameIndex + 1}`,
          width: 1200,
          height: 1500,
          position: frameIndex,
          isHoverImage: false,
          is360Frame: true,
        }))
      : [];

    const now = Timestamp.now();
    const productDoc = {
      name: seed.name,
      description: seed.description,
      materials: seed.materials,
      technologies: seed.technologies,
      gender: seed.gender,
      priceInCents: seed.priceInCents,
      compareAtPriceInCents: seed.compareAtPriceInCents ?? null,
      videoUrl: null,
      has360View,
      isNewArrival: seed.isNewArrival,
      isBestSeller: seed.isBestSeller,
      isPublished: true,
      publishedAt: now,
      sizeGuideId: null,
      averageRating: null,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
      brand: { slug: brand.slug, name: brand.name },
      category: { slug: category.slug, name: category.name },
      collection: collection ? { slug: collection.slug, name: collection.name } : null,
    };

    const productRef = db.collection('products').doc(seed.slug);
    const batch = db.batch();
    batch.set(productRef, productDoc);
    for (const image of [...imagesData, ...framesData]) {
      batch.set(productRef.collection('images').doc(), image);
    }
    for (const variant of variantsData) {
      const { localId, ...variantDoc } = variant;
      batch.set(productRef.collection('variants').doc(localId), variantDoc);
    }
    await batch.commit();

    const colorNames = new Set(seed.colors.map((c) => c.name));
    const record: AlgoliaProductRecord = {
      objectID: seed.slug,
      name: seed.name,
      description: seed.description,
      brand: { id: brand.slug, name: brand.name, slug: brand.slug },
      category: { id: category.slug, name: category.name, slug: category.slug },
      collection: collection
        ? { id: collection.slug, name: collection.name, slug: collection.slug }
        : null,
      gender: seed.gender,
      priceInCents: seed.priceInCents,
      compareAtPriceInCents: seed.compareAtPriceInCents ?? null,
      primaryImage: { id: `${seed.slug}-img-0`, ...imagesData[0]! },
      hoverImage: imagesData[1] ? { id: `${seed.slug}-img-1`, ...imagesData[1] } : null,
      availableColors: colorNames.size,
      isNewArrival: seed.isNewArrival,
      isBestSeller: seed.isBestSeller,
      averageRating: null,
      reviewCount: 0,
      colorNames: Array.from(colorNames),
      colorFacets: seed.colors.map((c) => `${c.name}|${c.hex}`),
      sizes: [...SIZES],
      publishedAtMs: now.toMillis(),
    };
    await algolia.saveProduct(record);

    createdProducts.push({ id: seed.slug, slug: seed.slug });
  }

  return createdProducts;
}

/** Sem senha — avaliadores fictícios nunca logam, só assinam as reviews de demonstração. */
async function seedReviewers(): Promise<{ id: string; name: string }[]> {
  return Promise.all(
    REVIEWER_SEEDS.map(async (reviewer) => ({
      id: await seedUser({
        name: reviewer.name,
        email: reviewer.email,
        passwordHash: null,
        role: 'CUSTOMER',
      }),
      name: reviewer.name,
    })),
  );
}

interface ReviewSeed {
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  withPhoto?: boolean;
}

const REVIEW_POOL: ReviewSeed[] = [
  {
    rating: 5,
    title: 'Melhor compra do ano',
    comment:
      'Construção impecável, o material é bem mais premium do que eu esperava pelo preço. Já é meu tênis do dia a dia.',
    isVerifiedPurchase: true,
    withPhoto: true,
  },
  {
    rating: 4,
    title: 'Muito bom, só o cadarço poderia ser melhor',
    comment:
      'Caimento perfeito e super confortável desde o primeiro uso. O único ponto é que o cadarço original é um pouco fino.',
    isVerifiedPurchase: true,
  },
  {
    rating: 5,
    title: 'Superou a expectativa',
    comment:
      'Comprei com receio pelo preço, mas a qualidade do material e o acabamento das costuras são de outro nível.',
    isVerifiedPurchase: true,
  },
  {
    rating: 3,
    title: 'Bom, mas numeração veio um pouco justa',
    comment:
      'O tênis em si é ótimo, mas pedi um número acima do que uso normalmente e ainda assim ficou justo. Vale conferir a tabela de medidas com atenção.',
    isVerifiedPurchase: true,
  },
  {
    rating: 5,
    title: 'Virou meu favorito',
    comment: 'Uso praticamente todo dia. Leve, confortável e o visual combina com tudo.',
    isVerifiedPurchase: false,
  },
  {
    rating: 4,
    title: 'Ótimo custo-benefício',
    comment: 'Pelo preço, entrega muito mais qualidade do que eu esperava. Recomendo.',
    isVerifiedPurchase: true,
    withPhoto: true,
  },
];

const QUESTION_POOL: { question: string; answer: string | null }[] = [
  {
    question: 'Esse modelo veste grande ou pequeno? Costumo usar 42 em outras marcas.',
    answer:
      'Nossa numeração segue o padrão BR — quem usa 42 em outras marcas geralmente veste bem no 42 aqui também. Em caso de dúvida, a troca de numeração é gratuita em até 30 dias.',
  },
  {
    question: 'O material é impermeável?',
    answer:
      'Não é impermeável, mas o couro nobuck tem resistência natural a respingos leves. Para chuva forte, recomendamos um impermeabilizante específico para o material.',
  },
  {
    question: 'Vocês têm previsão de reposição do tamanho 39?',
    answer: null,
  },
  {
    question: 'Esse tênis serve para caminhada longa ou é só para uso casual?',
    answer:
      'É desenvolvido para uso casual do dia a dia. Para caminhadas longas ou corrida, recomendamos a linha Terra Runner.',
  },
];

async function seedReviewsAndQuestions(
  products: { id: string; slug: string }[],
  reviewers: Awaited<ReturnType<typeof seedReviewers>>,
) {
  // Nem todo produto recebe review/pergunta — em um catálogo real, produtos
  // recém-publicados também começam sem nenhuma avaliação.
  const productsWithReviews = products.filter((_, index) => index % 2 === 0);
  const productsWithQuestions = products.filter((_, index) => index % 3 === 0);

  for (const [productIndex, product] of productsWithReviews.entries()) {
    const reviewCount = 1 + (productIndex % 4);
    const selectedReviews = Array.from(
      { length: reviewCount },
      (_, i) => REVIEW_POOL[(productIndex + i) % REVIEW_POOL.length]!,
    );

    // Review migrou pro Firestore na Fase 4 — doc em
    // `products/{slug}/reviews/{userId}` (um por avaliador por produto,
    // mesmo id do `ReviewsRepository.create` real).
    const batch = db.batch();
    selectedReviews.forEach((review, i) => {
      const reviewer = reviewers[(productIndex + i) % reviewers.length]!;
      batch.set(
        db.collection('products').doc(product.slug).collection('reviews').doc(reviewer.id),
        {
          userId: reviewer.id,
          authorName: reviewer.name,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          imageUrls: review.withPhoto ? [art(productIndex + i)] : [],
          videoUrls: [],
          isVerifiedPurchase: review.isVerifiedPurchase,
          helpfulCount: 0,
          createdAt: Timestamp.now(),
        },
      );
    });
    await batch.commit();

    // Contadores denormalizados no doc do produto — mesmo padrão que
    // `ReviewsRepository.create` incrementa numa transação real, só que
    // calculado de uma vez aqui (não há concorrência num seed). `reviewCount`
    // já existe neste escopo (quantas reviews este produto recebe).
    const ratingSum = selectedReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((ratingSum / reviewCount) * 10) / 10;
    const ratingHistogram: Record<string, number> = {};
    for (const review of selectedReviews) {
      const key = String(review.rating);
      ratingHistogram[key] = (ratingHistogram[key] ?? 0) + 1;
    }

    await db
      .collection('products')
      .doc(product.slug)
      .set({ ratingSum, reviewCount, averageRating, ratingHistogram }, { merge: true });
    await algolia.updateRating(product.slug, averageRating, reviewCount);
  }

  for (const [productIndex, product] of productsWithQuestions.entries()) {
    const questionCount = 1 + (productIndex % 2);
    const selectedQuestions = Array.from(
      { length: questionCount },
      (_, i) => QUESTION_POOL[(productIndex + i) % QUESTION_POOL.length]!,
    );

    const batch = db.batch();
    selectedQuestions.forEach((question, i) => {
      batch.set(db.collection('products').doc(product.slug).collection('questions').doc(), {
        askerName: ['Fernanda L.', 'Pedro H.', 'Ana Clara', 'Bruno S.'][i % 4]!,
        question: question.question,
        answer: question.answer,
        answeredAt: question.answer ? Timestamp.now() : null,
        createdAt: Timestamp.now(),
      });
    });
    await batch.commit();
  }
}

/**
 * `pnpm db:seed:production` (flag `--production`): carga inicial de uma
 * loja de verdade. Só o catálogo de demonstração, para a dona da loja ter
 * o que editar/excluir no painel — sem contas de teste (senhas públicas
 * neste arquivo), sem cupom de teste e sem avaliações/perguntas fictícias
 * (apresentá-las como de clientes reais seria propaganda enganosa). E
 * nunca apaga nada: se o banco já tem produto ou pedido, aborta.
 */
const IS_PRODUCTION_SEED = process.argv.includes('--production');

async function assertSafeToSeed(): Promise<void> {
  if (!IS_PRODUCTION_SEED) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'O seed de desenvolvimento APAGA pedidos e catálogo e cria contas admin de teste — recusado em produção. Para a carga inicial da loja, use `pnpm db:seed:production`.',
      );
    }
    return;
  }
  const [productsCount, ordersCount] = await Promise.all([
    db.collection('products').count().get(),
    db.collection('orders').count().get(),
  ]);
  const products = productsCount.data().count;
  const orders = ordersCount.data().count;
  if (products > 0 || orders > 0) {
    throw new Error(
      `Este banco já tem dados (${products} produtos, ${orders} pedidos) — a carga inicial só roda num banco vazio e nunca apaga nada.`,
    );
  }
}

async function main() {
  await assertSafeToSeed();

  if (!IS_PRODUCTION_SEED) {
    console.warn('Limpando dados de catálogo existentes...');
    await resetCatalogData();
  }

  console.warn('Semeando marcas, categorias e coleções...');
  const [brands, categories, collections] = await Promise.all([
    seedBrands(),
    seedCategories(),
    seedCollections(),
  ]);

  console.warn('Semeando banners e vitrine social...');
  await Promise.all([seedBanners(), seedSocialPosts()]);

  console.warn('Semeando produtos, variantes e imagens...');
  const products = await seedProducts(brands, categories, collections);

  if (IS_PRODUCTION_SEED) {
    console.warn(
      'Carga inicial concluída: catálogo de demonstração, sem contas nem avaliações de teste. Crie a conta da administradora com `pnpm exec tsx scripts/create-admin.ts email "Nome"`.',
    );
    return;
  }

  console.warn('Semeando avaliadores, avaliações e perguntas...');
  const reviewers = await seedReviewers();
  await seedReviewsAndQuestions(products, reviewers);

  console.warn('Semeando conta admin e cupom de e2e...');
  await seedE2EFixtures();

  console.warn('Seed concluído.');
}

main()
  .catch((error: unknown) => {
    console.error('Falha ao rodar o seed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    // O SDK do Firebase Admin mantém o canal gRPC aberto — sem isto, o
    // processo nunca terminaria sozinho depois do seed concluído.
    process.exit(process.exitCode ?? 0);
  });
