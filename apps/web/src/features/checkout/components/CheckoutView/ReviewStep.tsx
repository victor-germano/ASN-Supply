import { Button, Heading, Text } from '@asn/ui';
import type { CheckoutFormValues } from './CheckoutFormValues';

const SHIPPING_METHOD_LABEL: Record<CheckoutFormValues['shippingMethod'], string> = {
  STANDARD: 'Padrão (5 a 8 dias úteis)',
  EXPRESS: 'Expressa (1 a 2 dias úteis)',
};

interface ReviewStepProps {
  values: CheckoutFormValues;
  errorMessage: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function ReviewStep({ values, errorMessage, isSubmitting, onSubmit }: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="border border-ink/10 p-5">
        <Heading as="h2" size="sm" className="mb-3">
          Contato
        </Heading>
        <Text size="sm">{values.guestName}</Text>
        <Text size="sm" tone="muted">
          {values.guestEmail} · {values.guestPhone}
        </Text>
      </div>

      <div className="border border-ink/10 p-5">
        <Heading as="h2" size="sm" className="mb-3">
          Entrega
        </Heading>
        <Text size="sm">{values.recipientName}</Text>
        <Text size="sm" tone="muted">
          {values.street}, {values.number}
          {values.complement ? ` — ${values.complement}` : ''}
        </Text>
        <Text size="sm" tone="muted">
          {values.neighborhood}, {values.city} — {values.state.toUpperCase()}
        </Text>
        <Text size="sm" tone="muted">
          CEP {values.zipCode}
        </Text>
        <Text size="sm" className="mt-2">
          {SHIPPING_METHOD_LABEL[values.shippingMethod]}
        </Text>
      </div>

      <div className="border border-ink/10 bg-bone-200 p-5">
        <Text size="sm">
          Pagamento online chega em breve. Ao confirmar, seu pedido fica registrado e aguardando —
          você recebe os próximos passos assim que o pagamento estiver disponível.
        </Text>
      </div>

      {errorMessage && (
        <Text size="sm" className="text-error" role="alert">
          {errorMessage}
        </Text>
      )}

      <Button size="lg" fullWidth isLoading={isSubmitting} onClick={onSubmit}>
        Confirmar pedido
      </Button>
    </div>
  );
}
