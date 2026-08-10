import type { TryOnAnalysisInput, TryOnAnalysisResult } from '@asn/types';
import { apiFetch } from './apiClient';

export function analyzeTryOn(input: TryOnAnalysisInput): Promise<TryOnAnalysisResult> {
  return apiFetch<TryOnAnalysisResult>('/tryon/analyze', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}
