/**
 * Configura o índice `products` do Algolia (atributos buscáveis/facetáveis
 * + réplicas de ordenação por preço/nota/mais recentes) — ver
 * `AlgoliaService.configureIndex`. Rodar uma vez por projeto Algolia novo
 * (produção, ou um app de teste à parte); idempotente, rodar de novo não
 * duplica nada, só reaplica a mesma configuração.
 *
 * Uso (de dentro de apps/api), com ALGOLIA_APP_ID/ALGOLIA_ADMIN_API_KEY
 * configuradas (local ou via console da hospedagem):
 *   pnpm exec tsx scripts/configure-algolia.ts
 */
import { AlgoliaService } from '../src/modules/algolia/algolia.service';

async function main() {
  const algolia = new AlgoliaService();
  await algolia.configureIndex();
  console.log(`Índice "${algolia.indexName}" configurado (atributos + réplicas de ordenação).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
