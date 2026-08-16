import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { TryOnAnalysisResult } from '@asn/types';
import type { EnvConfig } from '../../config/env.validation';
import { TryOnAnalyzer, type TryOnAnalysisContext } from './tryon-analyzer';

const MODEL = 'claude-haiku-4-5-20251001';

// Mesmo shape de `TryOnAnalysisResult` (sem `isSimulated`/`disclaimer` — quem
// define isso é este adapter, não o modelo). Validado com zod "clássico"
// (mesma API usada em `env.validation.ts`) em vez do helper `zodOutputFormat`
// do SDK, que depende do subpath `zod/v4` (incompatível a nível de tipos com
// o `zod` v3 usado no resto da API) — pedir JSON explicitamente no prompt e
// validar a resposta manualmente é mais simples e não introduz uma segunda
// versão de zod só para este arquivo.
const analysisSchema = z.object({
  styleAnalysis: z.string().min(1),
  fitRecommendation: z.object({
    recommendedSize: z.string().min(1).nullable(),
    note: z.string().min(1),
  }),
});

const DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,(.+)$/;

const SYSTEM_PROMPT = `Você é um consultor de estilo e caimento de calçados. Analise a foto enviada
junto com os dados do produto e responda APENAS com um objeto JSON válido, sem
nenhum texto antes ou depois, no formato exato:
{"styleAnalysis":"...","fitRecommendation":{"recommendedSize":"..." ou null,"note":"..."}}

Regras:
- "styleAnalysis": 2 a 4 frases em português, sugerindo como combinar o produto
  (citando nome/marca/categoria) com o que aparece na foto — roupas, paleta de
  cores, estilo geral da pessoa. Tom consultivo, específico, nunca genérico.
- "fitRecommendation.recommendedSize": um palpite de numeração BR (ex: "40") SE
  e somente se for possível estimar algo minimamente informado a partir da
  foto (ex: proporção visível do pé); caso contrário, null — nunca invente um
  número sem base nenhuma.
- "fitRecommendation.note": sempre deixe claro que é uma ESTIMATIVA por foto,
  não uma medição, e recomende conferir a tabela de medidas do produto antes
  de decidir. Nunca apresente o palpite como certeza.`;

/**
 * Adapter real do Provador Digital Fase 2: análise de estilo/caimento via
 * Claude com visão, substituindo o parecer ilustrativo do `MockTryOnAnalyzer`
 * quando `ANTHROPIC_API_KEY` está configurada (ver factory em
 * `tryon.module.ts`). `photoBase64` já chega como data URL JPEG redimensionada
 * no client (ver `resizeImage.ts` no frontend) — bem dentro do limite de
 * imagem da Anthropic, sem necessidade de reprocessar aqui.
 */
@Injectable()
export class ClaudeTryOnAnalyzer extends TryOnAnalyzer {
  private readonly logger = new Logger(ClaudeTryOnAnalyzer.name);
  private readonly client: Anthropic;

  constructor(config: ConfigService<EnvConfig, true>) {
    super();
    this.client = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY', { infer: true }) });
  }

  async analyze(context: TryOnAnalysisContext): Promise<TryOnAnalysisResult> {
    const match = DATA_URL_PATTERN.exec(context.photoBase64);
    if (!match) {
      // AnalyzeTryOnDto já valida esse formato antes de chegar aqui — chegar
      // neste ponto sem bater indica um bug em outra camada, não input do
      // usuário, daí o 500 em vez de um 400.
      throw new InternalServerErrorException({
        errorCode: 'INVALID_PHOTO_FORMAT',
        message: 'Não foi possível processar a foto enviada.',
      });
    }
    const [, mediaType, base64Data] = match;

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: `image/${mediaType}` as 'image/jpeg' | 'image/png' | 'image/webp',
                data: base64Data!,
              },
            },
            {
              type: 'text',
              text: `Produto: ${context.product.name}, marca ${context.product.brandName}, categoria ${context.product.categoryName}.`,
            },
          ],
        },
        // Prefill: força o modelo a começar a resposta já dentro do objeto
        // JSON, em vez de confiar só na instrução do system prompt — reduz
        // bastante a chance de vir texto explicativo antes do JSON.
        { role: 'assistant', content: '{' },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
      throw new InternalServerErrorException({
        errorCode: 'TRYON_ANALYSIS_FAILED',
        message: 'Não foi possível gerar a análise agora. Tente novamente em instantes.',
      });
    }

    const rawJson = `{${textBlock.text}`;
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawJson);
    } catch {
      this.logger.error(`Resposta do Claude não é JSON válido: ${rawJson.slice(0, 500)}`);
      throw new InternalServerErrorException({
        errorCode: 'TRYON_ANALYSIS_FAILED',
        message: 'Não foi possível gerar a análise agora. Tente novamente em instantes.',
      });
    }

    const result = analysisSchema.safeParse(parsedJson);
    if (!result.success) {
      this.logger.error(
        `Resposta do Claude não bate com o schema esperado: ${result.error.message}`,
      );
      throw new InternalServerErrorException({
        errorCode: 'TRYON_ANALYSIS_FAILED',
        message: 'Não foi possível gerar a análise agora. Tente novamente em instantes.',
      });
    }

    return {
      isSimulated: false,
      disclaimer: null,
      styleAnalysis: result.data.styleAnalysis,
      fitRecommendation: result.data.fitRecommendation,
    };
  }
}
