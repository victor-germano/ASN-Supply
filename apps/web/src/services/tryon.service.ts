import type { TryOnAnalysisInput, TryOnAnalysisResult, TryOnConfig } from '@asn/types';
import { apiFetch } from './apiClient';
import { serverFetch } from './serverFetch';

export function analyzeTryOn(input: TryOnAnalysisInput): Promise<TryOnAnalysisResult> {
  return serverFetch<TryOnAnalysisResult>('/tryon/analyze', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

/**
 * Com ou sem análise de foto — muda só quando a chave da IA é configurada
 * na API. API fora do ar não derruba a página: cai no modo sem foto, que é
 * o que funciona sempre.
 */
export async function getTryOnConfig(): Promise<TryOnConfig> {
  try {
    return await apiFetch<TryOnConfig>('/tryon/config', { revalidateSeconds: 300 });
  } catch {
    return { usesPhoto: false };
  }
}
