import type { TryOnAnalysisInput, TryOnAnalysisResult } from '@asn/types';
import { serverFetch } from './serverFetch';

export function analyzeTryOn(input: TryOnAnalysisInput): Promise<TryOnAnalysisResult> {
  return serverFetch<TryOnAnalysisResult>('/tryon/analyze', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}
