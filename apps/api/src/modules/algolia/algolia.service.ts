import { Injectable, Logger } from '@nestjs/common';
import { algoliasearch, type SearchClient } from 'algoliasearch';

export interface AlgoliaImageAsset {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  position: number;
}

/**
 * Espelha o shape inteiro de `ProductSummary` (não só os campos de busca/
 * filtro) — o hit do Algolia vira a listagem direto, sem round-trip ao
 * Firestore por resultado. `objectID` é o slug, que também vira `id`/`slug`
 * no `ProductSummary` montado a partir do hit.
 */
export interface AlgoliaProductRecord {
  objectID: string; // slug
  name: string;
  description: string;
  brand: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
  collection: { id: string; name: string; slug: string } | null;
  gender: string;
  priceInCents: number;
  compareAtPriceInCents: number | null;
  primaryImage: AlgoliaImageAsset;
  hoverImage: AlgoliaImageAsset | null;
  availableColors: number;
  isNewArrival: boolean;
  isBestSeller: boolean;
  averageRating: number | null;
  reviewCount: number;
  /** Nomes de cor puros — usado pra FILTRAR (`filters.colorNames` não carrega o hex, só o nome). */
  colorNames: string[];
  /** `"${colorName}|${colorHex}"` — facetar nisso (em vez de só `colorName`) deixa a contagem já carregar o hex junto, sem precisar de uma segunda consulta pra montar `ProductColorFacetOption`. Não usado pra filtrar (não dá pra montar a combinação certa sem saber o hex de antemão). */
  colorFacets: string[];
  sizes: string[];
  publishedAtMs: number;
}

const REPLICAS = {
  PRICE_ASC: 'products_price_asc',
  PRICE_DESC: 'products_price_desc',
  BEST_SELLING: 'products_best_selling',
  TOP_RATED: 'products_top_rated',
  NEWEST: 'products_newest',
} as const;

export type AlgoliaSortOption = keyof typeof REPLICAS;

/**
 * Wrapper fino do cliente Algolia — só o que o catálogo precisa: espelhar
 * produto publicado (`AdminProductsRepository`, único escritor) e buscar/
 * facetar (`ProductsRepository`, único leitor de busca). Firestore continua
 * sendo a fonte da verdade; se o espelhamento aqui falhar, loga e segue —
 * nunca derruba uma escrita no painel admin por causa do índice de busca.
 */
@Injectable()
export class AlgoliaService {
  private readonly logger = new Logger(AlgoliaService.name);
  private readonly client: SearchClient;
  readonly indexName: string;

  constructor() {
    const appId = process.env.ALGOLIA_APP_ID;
    const apiKey = process.env.ALGOLIA_ADMIN_API_KEY;
    this.indexName = process.env.ALGOLIA_INDEX_NAME || 'products';
    if (!appId || !apiKey) {
      throw new Error('ALGOLIA_APP_ID/ALGOLIA_ADMIN_API_KEY ausentes.');
    }
    this.client = algoliasearch(appId, apiKey);
  }

  indexNameForSort(sort: AlgoliaSortOption | undefined): string {
    return sort ? REPLICAS[sort] : this.indexName;
  }

  async saveProduct(record: AlgoliaProductRecord): Promise<void> {
    try {
      await this.client.saveObject({ indexName: this.indexName, body: record });
    } catch (error) {
      this.logger.error(`Falha ao indexar produto ${record.objectID} no Algolia`, error as Error);
    }
  }

  /**
   * Atualização parcial (não cria o registro se não existir — produto
   * despublicado não está no índice, e não deveria voltar a entrar só por
   * causa de uma nota nova). Usada por `ReviewsRepository`, que não tem o
   * resto dos campos do produto à mão pra fazer um `saveProduct` completo.
   */
  async updateRating(
    slug: string,
    averageRating: number | null,
    reviewCount: number,
  ): Promise<void> {
    try {
      await this.client.partialUpdateObject({
        indexName: this.indexName,
        objectID: slug,
        attributesToUpdate: { averageRating, reviewCount },
        createIfNotExists: false,
      });
    } catch (error) {
      this.logger.error(`Falha ao atualizar nota do produto ${slug} no Algolia`, error as Error);
    }
  }

  async deleteProduct(slug: string): Promise<void> {
    try {
      await this.client.deleteObject({ indexName: this.indexName, objectID: slug });
    } catch (error) {
      this.logger.error(`Falha ao remover produto ${slug} do Algolia`, error as Error);
    }
  }

  async search<T>(params: {
    indexName: string;
    query?: string;
    filters?: string;
    facets?: string[];
    page?: number;
    hitsPerPage?: number;
  }) {
    return this.client.searchSingleIndex<T>({
      indexName: params.indexName,
      searchParams: {
        query: params.query ?? '',
        filters: params.filters,
        facets: params.facets,
        page: params.page,
        hitsPerPage: params.hitsPerPage,
      },
    });
  }

  /** Configura atributos buscáveis/facetáveis e cria as réplicas de ordenação — chamado uma vez pelo script de setup, não a cada boot. */
  async configureIndex(): Promise<void> {
    await this.client.setSettings({
      indexName: this.indexName,
      // `forwardToReplicas`: réplica não herda `attributesForFaceting`/
      // `searchableAttributes` da principal sozinha — sem isto, qualquer
      // busca que caia numa réplica (ordenação por preço/nota/mais
      // recentes) simplesmente não encontra nada ao filtrar por marca,
      // categoria etc., porque o atributo não existe como facetável
      // NAQUELE índice específico.
      forwardToReplicas: true,
      indexSettings: {
        searchableAttributes: ['name', 'description', 'brand.name'],
        attributesForFaceting: [
          'brand.slug',
          'category.slug',
          'collection.slug',
          'gender',
          'colorFacets',
          'filterOnly(colorNames)',
          'sizes',
          'priceInCents',
        ],
        replicas: Object.values(REPLICAS),
      },
    });

    await this.client.setSettings({
      indexName: REPLICAS.PRICE_ASC,
      indexSettings: { customRanking: ['asc(priceInCents)'] },
    });
    await this.client.setSettings({
      indexName: REPLICAS.PRICE_DESC,
      indexSettings: { customRanking: ['desc(priceInCents)'] },
    });
    await this.client.setSettings({
      indexName: REPLICAS.BEST_SELLING,
      indexSettings: { customRanking: ['desc(isBestSeller)', 'desc(publishedAtMs)'] },
    });
    await this.client.setSettings({
      indexName: REPLICAS.TOP_RATED,
      indexSettings: { customRanking: ['desc(averageRating)', 'desc(publishedAtMs)'] },
    });
    await this.client.setSettings({
      indexName: REPLICAS.NEWEST,
      indexSettings: { customRanking: ['desc(publishedAtMs)'] },
    });
  }
}
