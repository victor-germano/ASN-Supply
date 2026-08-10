'use client';

import { useState } from 'react';
import type { ProductSummary, TryOnAnalysisResult } from '@asn/types';
import { Button, Container, Heading, Text } from '@asn/ui';
import { analyzeTryOnAction } from '@/actions/tryon';
import { PhotoUploader } from './PhotoUploader';
import { ProductPicker } from './ProductPicker';
import { TryOnResult } from './TryOnResult';

/**
 * Provador Digital (Módulo 7) — Fase 1. Página dedicada (não amarrada a um
 * produto específico da PDP): o cliente sobe a foto e só depois escolhe o
 * produto entre o catálogo. Sem ANTHROPIC_API_KEY ainda (decisão do
 * usuário), a análise vem de `MockTryOnAnalyzer` — o resultado sempre
 * chega com `isSimulated`, e a UI mostra isso explicitamente (badge
 * "Prévia" + aviso), nunca finge que é uma leitura real da foto.
 */
export function TryOnView() {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);
  const [result, setResult] = useState<TryOnAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // PhotoUploader guarda seu próprio erro de processamento como estado
  // local (não deriva de `photoDataUrl`) — "Recomeçar" limpando só
  // `photoDataUrl` no pai deixaria uma mensagem de erro antiga presa na
  // tela mesmo com o campo visualmente vazio de novo. Mudar a `key` força
  // o React a desmontar e remontar do zero, sem precisar duplicar estado
  // de erro no componente pai.
  const [resetKey, setResetKey] = useState(0);

  const canAnalyze = Boolean(photoDataUrl && selectedProduct) && !isAnalyzing;

  // Trocar a foto ou o produto (via "Remover foto"/"Trocar", não só
  // "Recomeçar") precisa derrubar um resultado antigo — sem isto, ele
  // continuaria na tela depois da troca, dando a entender (errado) que já
  // é o parecer da nova combinação.
  function handlePhotoChange(dataUrl: string | null) {
    setPhotoDataUrl(dataUrl);
    setResult(null);
    setError(null);
  }

  function handleProductSelect(product: ProductSummary | null) {
    setSelectedProduct(product);
    setResult(null);
    setError(null);
  }

  async function handleAnalyze() {
    if (!photoDataUrl || !selectedProduct) return;
    setError(null);
    setIsAnalyzing(true);
    try {
      const response = await analyzeTryOnAction({
        photoBase64: photoDataUrl,
        productId: selectedProduct.id,
      });
      if (!response.success) {
        setError(response.message);
        return;
      }
      setResult(response.result);
    } catch {
      // Falha na própria chamada da Server Action (ex: limite de tamanho
      // do body, erro de transporte) — não é um `ApiError` capturado
      // dentro de `analyzeTryOnAction`, então chega aqui sem mensagem.
      setError('Não foi possível analisar sua foto agora. Tente novamente em instantes.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleReset() {
    setPhotoDataUrl(null);
    setSelectedProduct(null);
    setResult(null);
    setError(null);
    setResetKey((key) => key + 1);
  }

  return (
    <main className="bg-bone-100">
      <Container className="py-section">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h1" size="lg" className="mb-3">
            Provador Digital
          </Heading>
          <Text tone="muted" className="mx-auto max-w-xl">
            Envie uma foto sua e escolha um tênis do catálogo — a IA analisa estilo, combinação e
            estimativa de caimento antes da compra.
          </Text>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-10 sm:grid-cols-2">
          <div>
            <Text
              size="xs"
              weight="semibold"
              className="mb-3 uppercase tracking-wider text-ink-muted"
            >
              1. Sua foto
            </Text>
            <PhotoUploader
              key={resetKey}
              photoDataUrl={photoDataUrl}
              onPhotoChange={handlePhotoChange}
            />
          </div>
          <div>
            <Text
              size="xs"
              weight="semibold"
              className="mb-3 uppercase tracking-wider text-ink-muted"
            >
              2. Escolha o produto
            </Text>
            <ProductPicker
              key={resetKey}
              selectedProduct={selectedProduct}
              onSelect={handleProductSelect}
            />
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-4xl">
          {error && (
            <Text size="sm" className="mb-4 text-error" role="alert">
              {error}
            </Text>
          )}
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              isLoading={isAnalyzing}
              disabled={!canAnalyze}
              onClick={handleAnalyze}
            >
              Analisar com IA
            </Button>
            {(photoDataUrl || selectedProduct) && (
              <Button variant="ghost" size="lg" type="button" onClick={handleReset}>
                Recomeçar
              </Button>
            )}
          </div>
        </div>

        {result && (
          <div className="mx-auto mt-10 max-w-4xl">
            <TryOnResult result={result} />
          </div>
        )}
      </Container>
    </main>
  );
}
