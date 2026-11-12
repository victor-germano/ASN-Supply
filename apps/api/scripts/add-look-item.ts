/**
 * Cadastra um item de "Complete o look" para um produto — curadoria manual.
 *
 * "Complete o look" — peças de outras lojas (Shein, AliExpress, Shopee,
 * Mercado Livre etc.) curadas manualmente para combinar com o produto,
 * exibidas no Provador Digital. De propósito NÃO é uma integração ao vivo
 * com essas plataformas: nenhuma delas oferece hoje uma API pública de
 * "combinar peça" para um pequeno lojista; AliExpress/Shopee têm programas
 * de afiliado que exigem aprovação externa, e Shein não tem API pública
 * acessível (só daria via scraping, fora de cotação — violaria os termos
 * deles). Curadoria manual, com link real pra cada peça, é o caminho sem
 * dependência de acesso de terceiros ainda não obtido.
 *
 * Não existe painel admin com CRUD ainda (Módulo 6), então isto é a única
 * forma de cadastrar um item real até lá — coloque um link de verdade, de um
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
 *
 * LookItem migrou pro Firestore na Fase 3 (ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md) — subcoleção
 * `products/{slug}/lookItems` (ver `LookItemDoc`/`findLookItems` em
 * `src/modules/catalog/products/products.repository.ts`).
 */
import { getDb } from '../src/config/firebase-admin';

const db = getDb();

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

  const productRef = db.collection('products').doc(slug!);
  const productSnap = await productRef.get();
  if (!productSnap.exists) {
    console.error(`Nenhum produto com slug "${slug}".`);
    process.exit(1);
  }

  const lookItems = productRef.collection('lookItems');
  const existingCount = (await lookItems.count().get()).data().count;

  await lookItems.add({
    platform: platform!,
    title: title!,
    imageUrl: imageUrl!,
    priceLabel: priceLabel!,
    externalUrl: externalUrl!,
    position: existingCount,
  });

  console.log(`Criado look item "${title}" (${platform}) para "${slug}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(process.exitCode ?? 0));
