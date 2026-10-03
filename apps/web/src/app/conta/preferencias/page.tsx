import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Heading } from '@asn/ui';
import { getCurrentUser } from '@/services/auth.service';
import { NotificationPreferences } from '@/features/account/components/NotificationPreferences/NotificationPreferences';

export const metadata: Metadata = {
  title: 'Preferências',
  robots: { index: false, follow: false },
};

/** Destino do link "não quer mais lembretes?" dos SMS — precisa ser direto e funcionar em um clique. */
export default async function PreferenciasPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/conta/preferencias');

  return (
    <div className="max-w-xl">
      <Heading as="h1" size="lg" className="mb-6">
        Preferências
      </Heading>
      <NotificationPreferences phone={user.phone} initialOptIn={user.marketingOptIn} />
    </div>
  );
}
