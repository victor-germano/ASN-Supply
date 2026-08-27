import { Badge, Heading, Text } from '@asn/ui';
import type { TryOnAnalysisResult } from '@asn/types';
import { SparklesIcon } from '@/components/icons';
import { CompleteTheLook } from './CompleteTheLook';

interface TryOnResultProps {
  result: TryOnAnalysisResult;
  /** Slug do produto analisado — usado só para buscar a curadoria de "Complete o look". */
  productSlug: string;
}

export function TryOnResult({ result, productSlug }: TryOnResultProps) {
  return (
    <div>
      <div className="border border-ink/10 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Heading as="h2" size="sm" className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-olive-600" />
            Parecer do Provador
          </Heading>
          {result.isSimulated && <Badge tone="outline">Prévia</Badge>}
        </div>

        {result.disclaimer && (
          <Text size="xs" tone="muted" className="mb-5 border-l-2 border-olive-500 pl-3">
            {result.disclaimer}
          </Text>
        )}

        <div className="flex flex-col gap-5">
          <div>
            <Text
              size="xs"
              weight="semibold"
              className="mb-1 uppercase tracking-wider text-ink-muted"
            >
              Estilo e combinação
            </Text>
            <Text>{result.styleAnalysis}</Text>
          </div>
          <div>
            <Text
              size="xs"
              weight="semibold"
              className="mb-1 uppercase tracking-wider text-ink-muted"
            >
              Caimento estimado
            </Text>
            <Text>
              {result.fitRecommendation.recommendedSize && (
                <>
                  Tamanho sugerido: <strong>{result.fitRecommendation.recommendedSize}</strong>
                  .{' '}
                </>
              )}
              {result.fitRecommendation.note}
            </Text>
          </div>
        </div>
      </div>

      <CompleteTheLook productSlug={productSlug} />
    </div>
  );
}
