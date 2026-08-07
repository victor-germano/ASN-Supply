import type { ProductGender } from '@asn/types';

/** Rótulos em português dos valores de `ProductGender` — única fonte de verdade (FilterSidebar e ActiveFilterChips compartilham). */
export const GENDER_LABELS: Record<ProductGender, string> = {
  MASCULINO: 'Masculino',
  FEMININO: 'Feminino',
  UNISSEX: 'Unissex',
  INFANTIL: 'Infantil',
};
