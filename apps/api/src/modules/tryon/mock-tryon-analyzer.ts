import { Injectable, Logger } from '@nestjs/common';
import type { TryOnAnalysisResult } from '@asn/types';
import { TryOnAnalyzer, type TryOnAnalysisContext } from './tryon-analyzer';

const STYLE_TEMPLATES = [
  (name: string, brand: string, category: string) =>
    `O ${name}, da ${brand}, tem uma identidade versátil que funciona tanto em looks casuais quanto em produções mais elaboradas — bem dentro do que se espera de um ${category.toLowerCase()}. Para um resultado equilibrado, aposte em peças de tons neutros ao redor dele, deixando o tênis como ponto focal do visual.`,
  (name: string, brand: string, category: string) =>
    `${name} (${brand}) combina bem com uma paleta minimalista — jeans reto, alfaiataria leve ou peças em tons terrosos tendem a valorizar as linhas deste ${category.toLowerCase()} sem disputar atenção.`,
  (name: string, brand: string, category: string) =>
    `A proposta do ${name} pede um visual descontraído: camadas simples, cores sóbrias e acessórios discretos deixam este ${category.toLowerCase()} da ${brand} como a peça de destaque do look.`,
];

const SIZE_POOL = ['38', '39', '40', '41', '42', '43', '44'];

/**
 * Adapter de análise enquanto não há `ANTHROPIC_API_KEY` configurada
 * (decisão do usuário) — mesma lógica do `NullPaymentGateway`: em vez de
 * bloquear a experiência inteira até a chave existir, devolve um parecer
 * ilustrativo (contextualizado com o produto de verdade, não genérico),
 * sinalizado como simulado via `isSimulated` — o frontend nunca deve
 * apresentar isto como se fosse uma análise real da foto do cliente.
 */
@Injectable()
export class MockTryOnAnalyzer extends TryOnAnalyzer {
  private readonly logger = new Logger(MockTryOnAnalyzer.name);

  async analyze(context: TryOnAnalysisContext): Promise<TryOnAnalysisResult> {
    this.logger.log(
      `Análise simulada solicitada para "${context.product.name}" (sem ANTHROPIC_API_KEY).`,
    );

    const template = STYLE_TEMPLATES[Math.floor(Math.random() * STYLE_TEMPLATES.length)]!;
    const recommendedSize = SIZE_POOL[Math.floor(Math.random() * SIZE_POOL.length)]!;

    return {
      isSimulated: true,
      styleAnalysis: template(
        context.product.name,
        context.product.brandName,
        context.product.categoryName,
      ),
      fitRecommendation: {
        recommendedSize,
        note: 'Estimativa ilustrativa — a recomendação real vai considerar suas proporções a partir da foto quando a análise por IA estiver ativa.',
      },
      disclaimer:
        'Esta é uma prévia do Provador Digital com dados de exemplo. A análise por IA de verdade (visão computacional sobre sua foto) chega em breve.',
    };
  }
}
