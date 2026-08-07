import Link from 'next/link';
import Image from 'next/image';
import { Heading, Section, Text } from '@asn/ui';
import { getReviews, getReviewsSummary } from '@/services/reviews.service';
import { Pagination } from '@/features/catalog/components/Pagination/Pagination';
import { StarIcon } from '@/components/icons';

export interface ReviewsSectionProps {
  productId: string;
  currentSearch: string;
}

function ratingHref(currentSearch: string, rating: number): string {
  const params = new URLSearchParams(currentSearch);
  const isActive = params.get('nota') === String(rating);
  if (isActive) {
    params.delete('nota');
  } else {
    params.set('nota', String(rating));
  }
  params.delete('avaliacaoPagina');
  const query = params.toString();
  return query ? `?${query}#avaliacoes` : '#avaliacoes';
}

export async function ReviewsSection({ productId, currentSearch }: ReviewsSectionProps) {
  const params = new URLSearchParams(currentSearch);
  const ratingParam = Number(params.get('nota'));
  const rating = [1, 2, 3, 4, 5].includes(ratingParam) ? ratingParam : undefined;
  const pageRaw = Number(params.get('avaliacaoPagina'));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const [summary, result] = await Promise.all([
    getReviewsSummary(productId),
    getReviews(productId, { rating, page, pageSize: 5 }),
  ]);

  const maxCount = Math.max(1, ...summary.distribution.map((entry) => entry.count));

  return (
    <Section id="avaliacoes" spacing="compact" className="border-t border-ink/10">
      <Heading as="h2" size="md" className="mb-8">
        Avaliações
      </Heading>

      {summary.reviewCount === 0 ? (
        <Text tone="muted">
          Ainda não há avaliações para este produto — a área do cliente (em breve) vai permitir
          avaliar compras confirmadas.
        </Text>
      ) : (
        <>
          <div className="mb-10 flex flex-col gap-8 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-1 sm:w-40">
              <Text as="span" className="font-display text-5xl leading-none text-ink">
                {summary.averageRating?.toFixed(1)}
              </Text>
              <div className="flex gap-0.5 text-olive-500" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(summary.averageRating ?? 0) ? '' : 'text-ink/15'
                    }`}
                  />
                ))}
              </div>
              <Text size="sm" tone="muted">
                {summary.reviewCount} {summary.reviewCount === 1 ? 'avaliação' : 'avaliações'}
              </Text>
            </div>

            <ul className="flex-1 space-y-1.5" aria-label="Filtrar por nota">
              {summary.distribution.map((entry) => (
                <li key={entry.rating}>
                  <Link
                    href={ratingHref(currentSearch, entry.rating)}
                    aria-current={rating === entry.rating}
                    className="flex items-center gap-3 py-1 text-sm text-ink-muted hover:text-ink"
                  >
                    <span className="w-10 shrink-0">{entry.rating} estrelas</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bone-200">
                      <span
                        className="block h-full rounded-full bg-olive-500"
                        style={{ width: `${(entry.count / maxCount) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right">{entry.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {result.items.length === 0 ? (
            <Text tone="muted">Nenhuma avaliação com essa nota ainda.</Text>
          ) : (
            <ul className="flex flex-col divide-y divide-ink/10">
              {result.items.map((review) => (
                <li key={review.id} className="py-6">
                  <div className="mb-2 flex items-center gap-3">
                    <div
                      className="flex gap-0.5 text-olive-500"
                      aria-label={`Nota ${review.rating} de 5`}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon
                          key={star}
                          className={`h-3.5 w-3.5 ${star <= review.rating ? '' : 'text-ink/15'}`}
                        />
                      ))}
                    </div>
                    {review.isVerifiedPurchase && (
                      <Text size="xs" tone="muted">
                        Compra verificada
                      </Text>
                    )}
                  </div>
                  <Text weight="medium" className="mb-1">
                    {review.title}
                  </Text>
                  <Text tone="muted" size="sm" className="mb-3">
                    {review.comment}
                  </Text>
                  {review.imageUrls.length > 0 && (
                    <div className="mb-3 flex gap-2">
                      {review.imageUrls.map((url) => (
                        <div key={url} className="relative h-16 w-16 overflow-hidden bg-bone-200">
                          <Image
                            src={url}
                            alt="Foto enviada na avaliação"
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <Text size="xs" tone="muted">
                    {review.authorName}
                  </Text>
                </li>
              ))}
            </ul>
          )}

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            currentSearch={currentSearch}
            paramKey="avaliacaoPagina"
            ariaLabel="Paginação de avaliações"
          />
        </>
      )}
    </Section>
  );
}
