import { Heading, Section, Text } from '@asn/ui';
import { getQuestions } from '@/services/reviews.service';
import { Pagination } from '@/features/catalog/components/Pagination/Pagination';

export interface QuestionsSectionProps {
  productId: string;
  currentSearch: string;
}

export async function QuestionsSection({ productId, currentSearch }: QuestionsSectionProps) {
  const params = new URLSearchParams(currentSearch);
  const pageRaw = Number(params.get('perguntaPagina'));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const result = await getQuestions(productId, { page, pageSize: 10 });

  return (
    <Section id="perguntas" spacing="compact" className="border-t border-ink/10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Heading as="h2" size="md">
          Perguntas e Respostas
        </Heading>
        <Text size="sm" tone="muted">
          Quer perguntar algo? <span className="text-ink underline-offset-4">Faça login</span> para
          enviar sua pergunta.
        </Text>
      </div>

      {result.items.length === 0 ? (
        <Text tone="muted">Ainda não há perguntas sobre este produto.</Text>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/10">
          {result.items.map((item) => (
            <li key={item.id} className="py-5">
              <Text weight="medium" className="mb-1">
                P: {item.question}
              </Text>
              <Text size="xs" tone="muted" className="mb-2">
                {item.askerName}
              </Text>
              {item.answer ? (
                <Text tone="muted" size="sm">
                  <span className="font-medium text-ink">R:</span> {item.answer}
                </Text>
              ) : (
                <Text tone="muted" size="sm" className="italic">
                  Ainda sem resposta.
                </Text>
              )}
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        currentSearch={currentSearch}
        paramKey="perguntaPagina"
        ariaLabel="Paginação de perguntas"
      />
    </Section>
  );
}
