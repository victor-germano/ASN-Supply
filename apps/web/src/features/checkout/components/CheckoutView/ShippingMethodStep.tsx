import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import { Heading, Text } from '@asn/ui';
import { TruckIcon } from '@/components/icons';
import { formatMoney } from '@/lib/formatMoney';
import { previewShippingCostInCents } from '../../utils/shippingPreview';
import type { CheckoutFormValues } from './CheckoutFormValues';

interface ShippingMethodStepProps {
  register: UseFormRegister<CheckoutFormValues>;
  watch: UseFormWatch<CheckoutFormValues>;
  subtotalInCents: number;
}

const OPTIONS = [
  { value: 'STANDARD' as const, label: 'Padrão', description: '5 a 8 dias úteis' },
  { value: 'EXPRESS' as const, label: 'Expressa', description: '1 a 2 dias úteis' },
];

export function ShippingMethodStep({ register, watch, subtotalInCents }: ShippingMethodStepProps) {
  const selected = watch('shippingMethod');

  return (
    <div>
      <Heading as="h2" size="sm" className="mb-4 flex items-center gap-2">
        <TruckIcon className="h-5 w-5" />
        Forma de envio
      </Heading>
      <div className="flex flex-col gap-3">
        {OPTIONS.map((option) => {
          const costInCents = previewShippingCostInCents(option.value, subtotalInCents);
          const isSelected = selected === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center justify-between gap-4 border px-5 py-4 transition-colors ${
                isSelected ? 'border-ink bg-bone-200' : 'border-ink/15 hover:border-ink/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  value={option.value}
                  className="h-4 w-4 accent-ink"
                  {...register('shippingMethod')}
                />
                <div>
                  <Text weight="medium">{option.label}</Text>
                  <Text size="sm" tone="muted">
                    {option.description}
                  </Text>
                </div>
              </div>
              <Text weight="semibold">
                {costInCents === 0
                  ? 'Grátis'
                  : formatMoney({ amountInCents: costInCents, currency: 'BRL' })}
              </Text>
            </label>
          );
        })}
      </div>
    </div>
  );
}
