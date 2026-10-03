/**
 * Formatos brasileiros usados nos formulários. A validação de celular é a
 * MESMA regra da API (`normalizeBrazilianMobile`) — aqui só pra avisar na
 * hora; quem decide de verdade é o servidor.
 */

const onlyDigits = (value: string) => value.replace(/\D/g, '');

/** Máscara progressiva enquanto digita: `11998887766` → `(11) 99888-7766`. */
export function maskBrazilianMobile(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Celular com DDD válido e nono dígito — fixo é recusado (SMS não chega em fixo). */
export function isValidBrazilianMobile(value: string): boolean {
  const digits = onlyDigits(value);
  return (
    digits.length === 11 &&
    Number(digits.slice(0, 2)) >= 11 &&
    digits[1] !== '0' &&
    digits[2] === '9'
  );
}

/** `01310100` → `01310-100`. */
export function maskCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export interface CepAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

/**
 * Consulta pública do ViaCEP (gratuita, sem chave). `null` quando o CEP não
 * existe ou o serviço não respondeu — o formulário então só deixa os campos
 * pra pessoa preencher à mão; nunca bloqueia o cadastro.
 */
export async function lookupCep(cep: string, signal?: AbortSignal): Promise<CepAddress | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    return {
      street: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  } catch {
    return null;
  }
}
