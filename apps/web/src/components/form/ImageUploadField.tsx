'use client';

import { useState, type ChangeEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { uploadAdminImageAction } from '@/actions/uploads';
import type { UploadedImage } from '@/services/uploads.service';

interface ImageUploadFieldProps {
  id: string;
  label: string;
  /** Resultado de `register('campoUrl')` — o campo de URL continua sendo o valor de verdade do formulário; o upload só o preenche. */
  registration: UseFormRegisterReturn;
  /**
   * Chamado com o resultado completo da Cloudinary (`url`/`width`/`height`)
   * — o chamador decide o que aplicar (`ProductForm` também preenche
   * largura/altura a partir daqui; `BrandManager`/`CategoryManager`/
   * `CollectionManager` usam só `url`).
   */
  onUploaded: (result: UploadedImage) => void;
  optional?: boolean;
}

/**
 * Campo de URL de imagem com um botão "Enviar arquivo" ao lado — nunca a
 * ÚNICA forma de preencher o campo: sem `CLOUDINARY_URL` configurada do
 * lado da API, o upload falha com uma mensagem clara
 * (`UnavailableImageUploader`) e o campo de URL continua funcionando
 * normalmente, exatamente como sempre funcionou antes deste componente
 * existir. Reaproveitado por `ProductForm`/`BrandManager`/
 * `CategoryManager`/`CollectionManager` — os quatro formulários do painel
 * admin que pedem uma URL de imagem.
 */
export function ImageUploadField({
  id,
  label,
  registration,
  onUploaded,
  optional,
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Limpa o input mesmo em sucesso — permite escolher o MESMO arquivo de
    // novo depois (o navegador não dispara `onChange` se o valor não muda).
    event.target.value = '';
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      const result = await uploadAdminImageAction(file);
      if (!result.success) {
        setError(result.message);
        return;
      }
      onUploaded({ url: result.url, width: result.width, height: result.height });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <label className={labelClassName} htmlFor={id}>
        {label} {optional && <span className="normal-case text-ink-muted/70">(opcional)</span>}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          className={inputClassName}
          placeholder="Cole uma URL ou envie um arquivo"
          {...registration}
        />
        <label className="flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap border border-ink/15 px-3 text-xs uppercase tracking-wider text-ink transition-colors hover:border-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
          {isUploading ? 'Enviando...' : 'Enviar arquivo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isUploading}
            onChange={handleFileChange}
          />
        </label>
      </div>
      {error && (
        <Text size="xs" className="mt-1 text-error" role="alert">
          {error}
        </Text>
      )}
    </div>
  );
}
