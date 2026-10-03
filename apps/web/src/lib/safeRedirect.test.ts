import { describe, expect, it } from 'vitest';
import { isSafeInternalPath } from './safeRedirect';

describe('isSafeInternalPath', () => {
  it('aceita caminhos internos', () => {
    expect(isSafeInternalPath('/checkout')).toBe(true);
    expect(isSafeInternalPath('/admin/pedidos/abc?aba=1')).toBe(true);
  });

  it.each([
    null,
    '',
    'https://golpe.com',
    '//golpe.com',
    '/\\golpe.com',
    '\\\\golpe.com',
    '/\t/golpe.com',
    'javascript:alert(1)',
  ])('recusa %j', (value) => {
    expect(isSafeInternalPath(value)).toBe(false);
  });
});
