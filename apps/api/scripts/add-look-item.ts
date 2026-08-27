/**
 * Cadastra um item de "Complete o look" para um produto — curadoria manual
 * (ver comentário do model `LookItem` no schema Prisma para o porquê de não
 * ser integração ao vivo com Shein/AliExpress/Shopee/Mercado Livre). Não
 * existe painel admin com CRUD ainda (Módulo 6), então isto é a única forma
 * de cadastrar um item real até lá — coloque um link de verdade, de um
 * produto que exista, de preferência com seu link de afiliado se você tiver
 * conta em alguma dessas plataformas.
 *
 * Uso (de dentro de apps/api):
 *   pnpm exec tsx scripts/add-look-item.ts \
 *     --slug tenis-slug-do-produto \
 *     --platform "Mercado Livre" \
 *     --title "Calça cargo bege" \
 *     --image https://... \
 *     --price "R$ 129,90" \
 *     --url https://...
 */
import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

function readArg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const slug = readArg('slug');
  const platform = readArg('platform');
  const title = readArg('title');
  const imageUrl = readArg('image');
  const priceLabel = readArg('price');
  const externalUrl = readArg('url');

  const missing = Object.entries({ slug, platform, title, imageUrl, priceLabel, externalUrl })
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    console.error(
      `Faltando: ${missing.join(', ')}. Ver o comentário no topo do arquivo para o uso completo.`,
    );
    process.exit(1);
  }

  const product = await prisma.product.findUnique({ where: { slug: slug! }, select: { id: true } });
  if (!product) {
    console.error(`Nenhum produto com slug "${slug}".`);
    process.exit(1);
  }

  const lastPosition = await prisma.lookItem.count({ where: { productId: product.id } });

  const created = await prisma.lookItem.create({
    data: {
      productId: product.id,
      platform: platform!,
      title: title!,
      imageUrl: imageUrl!,
      priceLabel: priceLabel!,
      externalUrl: externalUrl!,
      position: lastPosition,
    },
  });

  console.log(`Criado look item "${created.title}" (${created.platform}) para "${slug}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
