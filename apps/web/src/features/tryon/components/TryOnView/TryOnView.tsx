'use client';

import { useState } from 'react';
import type { ProductSummary, TryOnAnalysisResult } from '@asn/types';
import { Button, Container, Heading, Text } from '@asn/ui';
import { analyzeTryOnAction } from '@/actions/tryon';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { PhotoUploader } from './PhotoUploader';
import { ProductPicker } from './ProductPicker';
import { TryOnResult } from './TryOnResult';

interface TryOnViewProps {
  /**
   * Vem da API (`/tryon/config`): com análise por IA configurada, a tela
   * pede a foto; sem ela, o Provador funciona como guia de estilo e medida
   * e nem pede foto — nunca coleta uma imagem que ninguém vai analisar.
   */
  usesPhoto: boolean;
}

/** Aceita "26,5" ou "26.5"; `null` = vazio ou fora de uma medida de pé plausível. */
function parseFootLength(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.'));
  if (!raw.trim() || !Number.isFinite(value) || value < 15 || value > 40) return null;
  return Math.round(value * 10) / 10;
}

const stepLabelClassName = 'mb-3 uppercase tracking-wider text-ink-muted';

/**
 * Provador Digital (Módulo 7). Página dedicada (não amarrada a um produto
 * específico da PDP): o cliente escolhe um tênis do catálogo, informa a
 * medida do pé e — quando há análise por IA — envia uma foto.
 */
export function TryOnView({ usesPhoto }: TryOnViewProps) {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);
  const [footLength, setFootLength] = useState('');
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

  const footLengthCm = parseFootLength(footLength);
  const footLengthInvalid = footLength.trim() !== '' && footLengthCm === null;
  const canAnalyze =
    Boolean(selectedProduct) &&
    (!usesPhoto || Boolean(photoDataUrl)) &&
    !footLengthInvalid &&
    !isAnalyzing;

  // Trocar a foto, o produto ou a medida precisa derrubar um resultado
  // antigo — sem isto, ele continuaria na tela depois da troca, dando a
  // entender (errado) que já é o parecer da nova combinação.
  function clearResult() {
    setResult(null);
    setError(null);
  }

  function handlePhotoChange(dataUrl: string | null) {
    setPhotoDataUrl(dataUrl);
    clearResult();
  }

  function handleProductSelect(product: ProductSummary | null) {
    setSelectedProduct(product);
    clearResult();
  }

  async function handleAnalyze() {
    if (!selectedProduct || (usesPhoto && !photoDataUrl)) return;
    setError(null);
    setIsAnalyzing(true);
    try {
      const response = await analyzeTryOnAction({
        productId: selectedProduct.id,
        ...(usesPhoto && photoDataUrl && { photoBase64: photoDataUrl }),
        ...(footLengthCm !== null && { footLengthCm }),
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
      setError('Não foi possível gerar seu parecer agora. Tente novamente em instantes.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleReset() {
    setPhotoDataUrl(null);
    setSelectedProduct(null);
    setFootLength('');
    clearResult();
    setResetKey((key) => key + 1);
  }

  const footLengthField = (
    <div>
      <label className={labelClassName} htmlFor="footLength">
        Comprimento do pé (cm)
      </label>
      <input
        id="footLength"
        inputMode="decimal"
        autoComplete="off"
        placeholder="Ex: 26,5"
        className={inputClassName}
        value={footLength}
        aria-invalid={footLengthInvalid}
        aria-describedby="footLengthHelp"
        onChange={(event) => {
          setFootLength(event.target.value);
          clearResult();
        }}
      />
      <Text id="footLengthHelp" size="xs" tone="muted" className="mt-2">
        {footLengthInvalid
          ? 'Informe a medida em centímetros, por exemplo 26,5.'
          : 'Encoste o calcanhar na parede, pise sobre uma folha de papel, marque a ponta do dedo mais longo e meça a distância. Com a medida, indicamos o tamanho exato.'}
      </Text>
    </div>
  );

  return (
    <main className="bg-bone-100">
      <Container className="py-section">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h1" size="lg" className="mb-3">
            Provador Digital
          </Heading>
          <Text tone="muted" className="mx-auto max-w-xl">
            {usesPhoto
              ? 'Envie uma foto sua, escolha um tênis do catálogo e informe a medida do seu pé — você recebe a análise de estilo e o tamanho indicado antes da compra.'
              : 'Escolha um tênis do catálogo e informe a medida do seu pé — você recebe o tamanho indicado e as melhores formas de combinar o modelo antes da compra.'}
          </Text>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-10 sm:grid-cols-2">
          {usesPhoto && (
            <div>
              <Text size="xs" weight="semibold" className={stepLabelClassName}>
                1. Sua foto
              </Text>
              <PhotoUploader
                key={resetKey}
                photoDataUrl={photoDataUrl}
                onPhotoChange={handlePhotoChange}
              />
            </div>
          )}
          <div>
            <Text size="xs" weight="semibold" className={stepLabelClassName}>
              {usesPhoto ? '2. Escolha o produto' : '1. Escolha o produto'}
            </Text>
            <ProductPicker
              key={resetKey}
              selectedProduct={selectedProduct}
              onSelect={handleProductSelect}
            />
          </div>
          <div className={usesPhoto ? 'sm:col-span-2 sm:max-w-sm' : undefined}>
            <Text size="xs" weight="semibold" className={stepLabelClassName}>
              {usesPhoto ? '3. Medida do seu pé' : '2. Medida do seu pé'}
            </Text>
            {footLengthField}
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
              Ver meu parecer
            </Button>
            {(photoDataUrl || selectedProduct || footLength) && (
              <Button variant="ghost" size="lg" type="button" onClick={handleReset}>
                Recomeçar
              </Button>
            )}
          </div>
        </div>

        {result && selectedProduct && (
          <div className="mx-auto mt-10 max-w-4xl">
            <TryOnResult result={result} productSlug={selectedProduct.slug} />
          </div>
        )}
      </Container>
    </main>
  );
}
