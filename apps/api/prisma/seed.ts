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
import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

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
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.socialPost.deleteMany();
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
];

const SIZES = ['38', '39', '40', '41', '42', '43', '44'];

async function seedProducts(
  brands: Awaited<ReturnType<typeof seedBrands>>,
  categories: Awaited<ReturnType<typeof seedCategories>>,
  collections: Awaited<ReturnType<typeof seedCollections>>,
) {
  const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const collectionBySlug = new Map(collections.map((collection) => [collection.slug, collection]));

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

    await prisma.product.create({
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
        isPublished: true,
        publishedAt: new Date(),
        brandId: brand.id,
        categoryId: category.id,
        collectionId: collection?.id,
        images: { create: imagesData },
        variants: { create: variantsData },
      },
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
  await seedProducts(brands, categories, collections);

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
