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
import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

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
 * fictícios. O seed nunca roda em produção.
 */
const DEMO_ADMIN_EMAIL = 'admin@example.com';
const DEMO_ADMIN_PASSWORD = 'AsnAdmin2026!';

/** Pool de composições abstratas próprias (public/seed-art/art-01.svg .. art-08.svg em apps/web). */
const ART_COUNT = 8;

function art(index: number): string {
  const n = (index % ART_COUNT) + 1;
  return `/seed-art/art-${String(n).padStart(2, '0')}.svg`;
}

async function resetCatalogData(): Promise<void> {
  // Ordem respeita as foreign keys (dependentes primeiro).
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productQuestion.deleteMany();
  await prisma.cartItem.deleteMany();
  // Apaga Order antes de OrderItem: a relação Order -> OrderItem (e Order ->
  // Payment) já é `onDelete: Cascade`, então isto também limpa OrderItem e
  // Payment. Sem isto, pedidos de teste do checkout (Módulo 4, guest —
  // `userId`/`addressId` nulos, nada prende o Order ao resto do catálogo)
  // ficavam órfãos no banco a cada rodada do seed em vez de serem
  // reseedados junto com o resto.
  await prisma.order.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.socialPost.deleteMany();
  // Só os "reviewers" de demonstração — reseedados a cada rodada junto com
  // as reviews que os referenciam. Restrito ao domínio fictício usado em
  // `seedReviewers` (@example.com): um `deleteMany()` sem filtro apagaria
  // qualquer conta real criada fora deste script (Módulo 5 em diante) toda
  // vez que o seed rodasse de novo.
  await prisma.user.deleteMany({ where: { email: { endsWith: '@example.com' } } });
  // Só o cupom fixo de e2e — nunca um `deleteMany()` sem filtro, que
  // apagaria cupons reais criados fora deste script.
  await prisma.coupon.deleteMany({ where: { code: E2E_COUPON_CODE } });
}

/** Contas admin (e2e e demonstração) + cupom fixos — ver comentários no topo do arquivo. */
async function seedE2EFixtures(): Promise<void> {
  const passwordHash = await bcrypt.hash(E2E_ADMIN_PASSWORD, BCRYPT_ROUNDS);
  await prisma.user.create({
    data: {
      name: 'Admin E2E',
      email: E2E_ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.coupon.create({
    data: {
      code: E2E_COUPON_CODE,
      percentageOff: 10,
      isActive: true,
    },
  });
  await prisma.user.create({
    data: {
      name: 'Administração ASN (demo)',
      email: DEMO_ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_ADMIN_PASSWORD, BCRYPT_ROUNDS),
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });
}

async function seedBrands() {
  return Promise.all([
    prisma.brand.create({ data: { name: 'Nova Court', slug: 'nova-court' } }),
    prisma.brand.create({ data: { name: 'Terra Runner', slug: 'terra-runner' } }),
    prisma.brand.create({ data: { name: 'Aster Studio', slug: 'aster-studio' } }),
    prisma.brand.create({ data: { name: 'Marrow Atelier', slug: 'marrow-atelier' } }),
  ]);
}

async function seedCategories() {
  return Promise.all([
    prisma.category.create({
      data: {
        name: 'Casual',
        slug: 'casual',
        imageUrl: art(0),
        imageAlt: 'Tênis casual off-white sobre fundo neutro',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Corrida',
        slug: 'corrida',
        imageUrl: art(11),
        imageAlt: 'Tênis de corrida em ambiente urbano',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Skate',
        slug: 'skate',
        imageUrl: art(6),
        imageAlt: 'Tênis de skate visto de perfil',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Basquete',
        slug: 'basquete',
        imageUrl: art(7),
        imageAlt: 'Tênis de cano alto para basquete',
      },
    }),
  ]);
}

async function seedCollections() {
  return Promise.all([
    prisma.collection.create({
      data: {
        name: 'Studio 001',
        slug: 'studio-001',
        description:
          'A primeira cápsula da casa: silhuetas limpas, paleta neutra e construção minimalista — pensada para durar além da estação.',
        coverImageUrl: art(0),
        coverImageAlt: 'Composição de tênis Studio 001 em estúdio',
        launchedAt: new Date('2026-05-01'),
      },
    }),
    prisma.collection.create({
      data: {
        name: 'Terra Collection',
        slug: 'terra-collection',
        description:
          'Desenvolvida para performance ao ar livre sem abrir mão de identidade — solados robustos, tons terrosos, acabamento técnico.',
        coverImageUrl: art(11),
        coverImageAlt: 'Tênis de trilha Terra Collection em ambiente externo',
        launchedAt: new Date('2026-03-10'),
      },
    }),
    prisma.collection.create({
      data: {
        name: 'Nightwalk',
        slug: 'nightwalk',
        description:
          'Edição de cano alto em couro premium e detalhes refletivos — feita para a cidade depois que o sol se põe.',
        coverImageUrl: art(13),
        coverImageAlt: 'Tênis de cano alto Nightwalk em cenário urbano noturno',
        launchedAt: new Date('2026-07-20'),
      },
    }),
  ]);
}

async function seedBanners() {
  await prisma.banner.createMany({
    data: [
      {
        title: 'Nightwalk chegou',
        subtitle: 'Cano alto, couro premium e detalhes refletivos — a nova edição da casa.',
        ctaLabel: 'Ver coleção',
        ctaHref: '/colecoes/nightwalk',
        imageUrlDesktop: art(13),
        imageUrlMobile: art(13),
        position: 0,
      },
      {
        title: 'Studio 001',
        subtitle: 'Silhuetas limpas, paleta neutra. A cápsula que abre a temporada.',
        ctaLabel: 'Explorar cápsula',
        ctaHref: '/colecoes/studio-001',
        imageUrlDesktop: art(0),
        imageUrlMobile: art(0),
        position: 1,
      },
      {
        title: 'Terra Collection',
        subtitle: 'Performance ao ar livre, identidade urbana.',
        ctaLabel: 'Ver lançamentos',
        ctaHref: '/colecoes/terra-collection',
        imageUrlDesktop: art(11),
        imageUrlMobile: art(11),
        position: 2,
      },
    ],
  });
}

async function seedSocialPosts() {
  await prisma.socialPost.createMany({
    data: Array.from({ length: 6 }, (_, index) => ({
      imageUrl: art(index + 2),
      permalink: 'https://instagram.com/asnsupply',
      caption: null,
      position: index,
    })),
  });
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
        sku: `${seed.slug}-${color.name.toLowerCase().replace(/\s+/g, '-')}-${size}`,
        size,
        colorName: color.name,
        colorHex: color.hex,
        stockQuantity: 5 + Math.floor(Math.random() * 20),
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
          is360Frame: true,
        }))
      : [];

    const product = await prisma.product.create({
      data: {
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        materials: seed.materials,
        technologies: seed.technologies,
        gender: seed.gender,
        priceInCents: seed.priceInCents,
        compareAtPriceInCents: seed.compareAtPriceInCents,
        isNewArrival: seed.isNewArrival,
        isBestSeller: seed.isBestSeller,
        has360View,
        isPublished: true,
        publishedAt: new Date(),
        brandId: brand.id,
        categoryId: category.id,
        collectionId: collection?.id,
        images: { create: [...imagesData, ...framesData] },
        variants: { create: variantsData },
      },
    });
    createdProducts.push({ id: product.id, slug: product.slug });
  }

  return createdProducts;
}

async function seedReviewers() {
  const reviewers = [
    { name: 'Marina Costa', email: 'marina.costa@example.com' },
    { name: 'Rafael Andrade', email: 'rafael.andrade@example.com' },
    { name: 'Juliana Prado', email: 'juliana.prado@example.com' },
    { name: 'Lucas Ferreira', email: 'lucas.ferreira@example.com' },
    { name: 'Beatriz Nunes', email: 'beatriz.nunes@example.com' },
    { name: 'Thiago Mendes', email: 'thiago.mendes@example.com' },
    { name: 'Camila Rocha', email: 'camila.rocha@example.com' },
    { name: 'Diego Salles', email: 'diego.salles@example.com' },
  ];

  return Promise.all(
    reviewers.map((reviewer) =>
      prisma.user.create({ data: { name: reviewer.name, email: reviewer.email } }),
    ),
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

    await prisma.review.createMany({
      data: selectedReviews.map((review, i) => ({
        productId: product.id,
        userId: reviewers[(productIndex + i) % reviewers.length]!.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        isVerifiedPurchase: review.isVerifiedPurchase,
        imageUrls: review.withPhoto ? [art(productIndex + i)] : [],
        videoUrls: [],
      })),
    });

    const averageRating =
      Math.round(
        (selectedReviews.reduce((sum, review) => sum + review.rating, 0) / selectedReviews.length) *
          10,
      ) / 10;

    // Denormalização feita aqui, na escrita — é exatamente o padrão que o
    // módulo de Avaliações real (fora do escopo do seed) precisa seguir
    // sempre que uma review for criada, editada ou removida.
    await prisma.product.update({
      where: { id: product.id },
      data: { averageRating, reviewCount: selectedReviews.length },
    });
  }

  for (const [productIndex, product] of productsWithQuestions.entries()) {
    const questionCount = 1 + (productIndex % 2);
    const selectedQuestions = Array.from(
      { length: questionCount },
      (_, i) => QUESTION_POOL[(productIndex + i) % QUESTION_POOL.length]!,
    );

    await prisma.productQuestion.createMany({
      data: selectedQuestions.map((question, i) => ({
        productId: product.id,
        askerName: ['Fernanda L.', 'Pedro H.', 'Ana Clara', 'Bruno S.'][i % 4]!,
        question: question.question,
        answer: question.answer,
        answeredAt: question.answer ? new Date() : null,
      })),
    });
  }
}

async function main() {
  console.warn('Limpando dados de catálogo existentes...');
  await resetCatalogData();

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
  .finally(async () => {
    await prisma.$disconnect();
  });
