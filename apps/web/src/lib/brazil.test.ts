import { afterEach, describe, expect, it, vi } from 'vitest';
import { isValidBrazilianMobile, lookupCep, maskBrazilianMobile, maskCep } from './brazil';

describe('maskBrazilianMobile', () => {
  it.each([
    ['1', '(1'],
    ['11', '(11'],
    ['119988', '(11) 9988'],
    ['11998887766', '(11) 99888-7766'],
    ['(11) 99888-77669999', '(11) 99888-7766'],
  ])('%s → %s', (input, expected) => {
    expect(maskBrazilianMobile(input)).toBe(expected);
  });
});

describe('isValidBrazilianMobile', () => {
  it('aceita celular com DDD', () => {
    expect(isValidBrazilianMobile('(11) 99888-7766')).toBe(true);
  });

  it.each(['(11) 3333-4444', '(01) 99888-7766', '99888-7766', ''])('recusa %s', (input) => {
    expect(isValidBrazilianMobile(input)).toBe(false);
  });
});

describe('maskCep', () => {
  it('formata enquanto digita', () => {
    expect(maskCep('01310')).toBe('01310');
    expect(maskCep('01310100')).toBe('01310-100');
    expect(maskCep('01310-1009')).toBe('01310-100');
  });
});

describe('lookupCep', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mapeia a resposta do ViaCEP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            logradouro: 'Avenida Paulista',
            bairro: 'Bela Vista',
            localidade: 'São Paulo',
            uf: 'SP',
          }),
        ),
      ),
    );
    await expect(lookupCep('01310-100')).resolves.toEqual({
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    });
  });

  it('CEP inexistente ou serviço fora do ar → null (preenchimento manual)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ erro: true }))));
    await expect(lookupCep('99999-999')).resolves.toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(lookupCep('01310-100')).resolves.toBeNull();
  });

  it('nem chama o serviço com CEP incompleto', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(lookupCep('0131')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
