import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { AiSearchResult } from '@asn/types';
import type { EnvConfig } from '../../../config/env.validation';
import { ProductsRepository } from './products.repository';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_RESULTS = 12;

const aiSearchResponseSchema = z.object({
  productIds: z.array(z.string()).max(MAX_RESULTS),
  summary: z.string().min(1),
});

const SYSTEM_PROMPT = `Você é um consultor de estilo de uma loja de tênis premium. Dada a busca em
linguagem natural de um cliente e a lista de produtos do catálogo (JSON), escolha os produtos mais
relevantes e responda APENAS com um objeto JSON válido, sem texto antes ou depois, no formato exato:
{"productIds":["id1","id2",...],"summary":"..."}

Regras:
- "productIds": até ${MAX_RESULTS} ids, do MAIS relevante para o MENOS relevante, só ids que existem
  na lista recebida. Lista vazia se genuinamente nada combinar com o pedido.
- "summary": 1-2 frases em português explicando o raciocínio da seleção (ex: por que esses tênis
  combinam com o pedido) — nunca genérico, sempre referenciando o que foi pedido.
- Nunca invente um produto que não está na lista recebida.`;

/**
 * "Busca por IA" (Módulo 8) — reaproveita a mesma `ASN_ANTHROPIC_API_KEY` do
 * Provador Digital (Fase 2). Sem a chave configurada, cai no fallback de
 * busca textual comum (`ProductsRepository.search`) — nunca finge análise
 * de IA que não aconteceu (`isAiPowered: false`, `summary: null`), mesmo
 * princípio do `StyleGuideTryOnAnalyzer`. Catálogo inteiro cabe num prompt só
 * (dúzias de produtos, não milhares) — está longe da escala que exigiria
 * embeddings/busca vetorial de verdade; se o catálogo crescer muito, isso
 * precisa ser revisitado.
 */
@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  private readonly client: Anthropic | null;

  constructor(
    private readonly repository: ProductsRepository,
    config: ConfigService<EnvConfig, true>,
  ) {
    const apiKey = config.get('ASN_ANTHROPIC_API_KEY', { infer: true });
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async search(query: string): Promise<AiSearchResult> {
    if (!this.client) {
      return this.fallbackSearch(query);
    }

    try {
      return await this.searchWithAi(this.client, query);
    } catch (error) {
      // Qualquer falha (rede, JSON inválido, schema incompatível) cai pro
      // fallback textual em vez de devolver erro — busca continua
      // funcionando mesmo se a IA estiver instável, só sem o raciocínio.
      this.logger.error(`Busca por IA falhou, caindo para busca textual: ${error}`);
      return this.fallbackSearch(query);
    }
  }

  private async searchWithAi(client: Anthropic, query: string): Promise<AiSearchResult> {
    const catalog = await this.repository.findCatalogSummaryForAi();
    if (catalog.length === 0) {
      return { products: [], summary: null, isAiPowered: false };
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Busca do cliente: "${query}"\n\nCatálogo:\n${JSON.stringify(catalog)}`,
        },
        // Prefill, mesmo truque de `ClaudeTryOnAnalyzer`: força a resposta a
        // já começar dentro do objeto JSON.
        { role: 'assistant', content: '{' },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) throw new Error('Resposta do Claude sem bloco de texto.');

    const parsed = aiSearchResponseSchema.parse(JSON.parse(`{${textBlock.text}`));
    const catalogIds = new Set(catalog.map((product) => product.id));
    const validIds = parsed.productIds.filter((id) => catalogIds.has(id));

    const products = await this.repository.findByIds(validIds);
    return { products, summary: parsed.summary, isAiPowered: true };
  }

  private async fallbackSearch(query: string): Promise<AiSearchResult> {
    const result = await this.repository.search({ query }, { page: 1, pageSize: MAX_RESULTS });
    return { products: result.items, summary: null, isAiPowered: false };
  }
}
