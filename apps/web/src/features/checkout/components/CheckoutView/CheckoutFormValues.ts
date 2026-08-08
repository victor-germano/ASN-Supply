import type { ShippingMethod } from '@asn/types';

export interface CheckoutFormValues {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  recipientName: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  shippingMethod: ShippingMethod;
}

export const CHECKOUT_FORM_DEFAULTS: CheckoutFormValues = {
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  recipientName: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  shippingMethod: 'STANDARD',
};
