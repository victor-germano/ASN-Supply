import { Injectable } from '@nestjs/common';
import type { TryOnAnalysisResult } from '@asn/types';
import { TryOnAnalyzer, type TryOnAnalysisContext } from './tryon-analyzer';
import { fitWithoutMeasure } from './size-chart';

type Guide = (name: string, brand: string) => string;

/** Orientação por tipo de tênis — a chave é o nome da categoria, sem acento e em minúsculas. */
const GUIDE_BY_CATEGORY: Record<string, Guide> = {
  casual: (name, brand) =>
    `O ${name}, da ${brand}, é um tênis de uso diário: vai bem com jeans reto ou calça de alfaiataria leve, com a barra na altura do tornozelo para o modelo aparecer. Tons neutros no restante do look (preto, cinza, bege, off-white) deixam o tênis como ponto de destaque. Com bermuda, prefira meia curta ou invisível.`,
  corrida: (name, brand) =>
    `O ${name}, da ${brand}, tem perfil esportivo: combina com calça jogger, legging ou shorts de tecido técnico, e também funciona no dia a dia com moletom e jaqueta leve. Como a silhueta já chama atenção, mantenha as peças de cima em cores lisas. Para treinar, use meia esportiva de cano curto, que evita atrito no calcanhar.`,
  skate: (name, brand) =>
    `O ${name}, da ${brand}, tem solado reto e visual de rua: fica melhor com calça de corte mais solto (reta, cargo ou jeans folgado) caindo sobre o tênis, e camiseta ou moletom por cima. Meia de cano médio aparente faz parte do estilo. Cores sóbrias na roupa equilibram o volume do modelo.`,
  basquete: (name, brand) =>
    `O ${name}, da ${brand}, tem cano e volume marcantes: pede calça afunilada ou jogger, para a barra não esconder o tênis, ou bermuda na altura do joelho. Camiseta ampla ou moletom equilibram a proporção. Como o modelo já é a peça de destaque, deixe o restante do look em uma ou duas cores.`,
};

const DEFAULT_GUIDE: Guide = (name, brand) =>
  `O ${name}, da ${brand}, é um modelo versátil: funciona com jeans reto, calça de alfaiataria leve ou bermuda. Tons neutros no restante do look deixam o tênis como ponto de destaque, e a barra da calça na altura do tornozelo valoriza o modelo.`;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Adapter usado sem `ASN_ANTHROPIC_API_KEY` (ver factory em
 * `tryon.module.ts`): o Provador funciona como guia da loja, sem foto e sem
 * serviço externo. O parecer é sempre o mesmo para o mesmo produto (nada
 * de sorteio) e não finge ter analisado ninguém — o que personaliza o
 * resultado é a medida do pé, tratada em `TryOnService`.
 */
@Injectable()
export class StyleGuideTryOnAnalyzer extends TryOnAnalyzer {
  readonly usesPhoto = false;

  async analyze(context: TryOnAnalysisContext): Promise<TryOnAnalysisResult> {
    const { name, brandName, categoryName } = context.product;
    const guide = GUIDE_BY_CATEGORY[normalize(categoryName)] ?? DEFAULT_GUIDE;

    return {
      isSimulated: false,
      styleAnalysis: guide(name, brandName),
      fitRecommendation: fitWithoutMeasure(),
      disclaimer:
        'Orientações do guia de estilo da ASN Supply para este modelo. O tamanho é calculado pela medida do seu pé, com a nossa tabela de medidas.',
    };
  }
}
