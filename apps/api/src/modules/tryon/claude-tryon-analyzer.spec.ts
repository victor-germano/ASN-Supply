import { describe, expect, it, vi } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { ClaudeTryOnAnalyzer } from './claude-tryon-analyzer';
import type { TryOnAnalysisContext } from './tryon-analyzer';

function fakeConfig(): ConfigService<EnvConfig, true> {
  return { get: () => 'fake-key' } as unknown as ConfigService<EnvConfig, true>;
}

const CONTEXT: TryOnAnalysisContext = {
  photoBase64: 'data:image/jpeg;base64,ZmFrZS1pbWFnZS1kYXRh',
  product: {
    id: 'p1',
    name: 'Marrow Junior',
    brandName: 'Marrow Atelier',
    categoryName: 'Basquete',
  },
};

/** Stub do client Anthropic — só precisa responder à chamada `messages.create`. */
function analyzerWithFakeClient(responseText: string): ClaudeTryOnAnalyzer {
  const analyzer = new ClaudeTryOnAnalyzer(fakeConfig());
  const fakeCreate = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: responseText }],
  });
  Reflect.set(analyzer, 'client', { messages: { create: fakeCreate } });
  return analyzer;
}

describe('ClaudeTryOnAnalyzer', () => {
  it('monta o prompt com nome, marca e categoria do produto (nunca dados do cliente)', async () => {
    const analyzer = new ClaudeTryOnAnalyzer(fakeConfig());
    const fakeCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '"styleAnalysis":"ok","fitRecommendation":{"recommendedSize":"40","note":"estimativa"}}',
        },
      ],
    });
    Reflect.set(analyzer, 'client', { messages: { create: fakeCreate } });

    await analyzer.analyze(CONTEXT);

    const callArgs = fakeCreate.mock.calls[0]![0];
    const textPart = callArgs.messages[0].content[1];
    expect(textPart.text).toContain('Marrow Junior');
    expect(textPart.text).toContain('Marrow Atelier');
    expect(textPart.text).toContain('Basquete');
    // Prefill força o início do JSON — reduz texto solto antes do objeto.
    expect(callArgs.messages[1]).toEqual({ role: 'assistant', content: '{' });
  });

  it('retorna isSimulated: false e disclaimer: null numa análise real', async () => {
    const analyzer = analyzerWithFakeClient(
      '"styleAnalysis":"Combina com looks minimalistas.","fitRecommendation":{"recommendedSize":"41","note":"Estimativa por foto — confira a tabela de medidas."}}',
    );

    const result = await analyzer.analyze(CONTEXT);

    expect(result).toEqual({
      isSimulated: false,
      disclaimer: null,
      styleAnalysis: 'Combina com looks minimalistas.',
      fitRecommendation: {
        recommendedSize: '41',
        note: 'Estimativa por foto — confira a tabela de medidas.',
      },
    });
  });

  it('aceita recommendedSize null quando o modelo não arrisca um palpite', async () => {
    const analyzer = analyzerWithFakeClient(
      '"styleAnalysis":"ok","fitRecommendation":{"recommendedSize":null,"note":"Não foi possível estimar."}}',
    );

    const result = await analyzer.analyze(CONTEXT);

    expect(result.fitRecommendation.recommendedSize).toBeNull();
  });

  it('lança erro quando a resposta não é JSON válido', async () => {
    const analyzer = analyzerWithFakeClient('desculpe, não consigo analisar esta imagem.');

    await expect(analyzer.analyze(CONTEXT)).rejects.toThrow(InternalServerErrorException);
  });

  it('lança erro quando o JSON não bate com o schema esperado', async () => {
    const analyzer = analyzerWithFakeClient('"algumOutroCampo":"valor"}');

    await expect(analyzer.analyze(CONTEXT)).rejects.toThrow(InternalServerErrorException);
  });

  it('lança erro quando photoBase64 não é uma data URL válida', async () => {
    const analyzer = analyzerWithFakeClient(
      '"styleAnalysis":"ok","fitRecommendation":{"recommendedSize":null,"note":"n"}}',
    );

    await expect(analyzer.analyze({ ...CONTEXT, photoBase64: 'nao-e-data-url' })).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
