export type CheckoutStep = 'contato' | 'frete' | 'revisao';

export const CHECKOUT_STEPS: { id: CheckoutStep; label: string }[] = [
  { id: 'contato', label: 'Contato e entrega' },
  { id: 'frete', label: 'Frete' },
  { id: 'revisao', label: 'Revisão' },
];

/** Campos do formulário validados antes de avançar de cada etapa (a etapa de revisão não tem campo próprio). */
export const STEP_FIELDS: Record<CheckoutStep, string[]> = {
  contato: [
    'guestName',
    'guestEmail',
    'guestPhone',
    'recipientName',
    'street',
    'number',
    'neighborhood',
    'city',
    'state',
    'zipCode',
  ],
  frete: ['shippingMethod'],
  revisao: [],
};
