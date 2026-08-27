import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Heading } from '@asn/ui';
import { getAddresses } from '@/services/address.service';
import { ApiError } from '@/services/apiClient';
import { AddressBook } from '@/features/account/components/AddressBook/AddressBook';

export const metadata: Metadata = {
  title: 'Meus Endereços',
  robots: { index: false, follow: false },
};

export default async function MeusEnderecosPage() {
  // Mesma defesa em profundidade de conta/pedidos/page.tsx — ver comentário lá.
  let addresses;
  try {
    addresses = await getAddresses();
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect('/entrar');
    }
    throw error;
  }

  return (
    <div>
      <Heading as="h1" size="lg" className="mb-6">
        Meus endereços
      </Heading>
      <AddressBook initialAddresses={addresses} />
    </div>
  );
}
