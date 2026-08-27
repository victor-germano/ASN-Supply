import Link from 'next/link';
import { UserIcon } from '@/components/icons';

/**
 * Link estático para /conta — decidir "está logado ou não" bem aqui
 * exigiria ler o cookie de sessão dentro do Header, que renderiza em toda
 * página via layout raiz; isso forçaria o site inteiro a virar dinâmico
 * (perde ISR/estático de home, PLP, PDP...). Em vez disso, `/conta` (já
 * sob o matcher do middleware, que garante sessão fresca) decide o
 * destino final — ver `conta/layout.tsx` e `conta/page.tsx`.
 */
export function AccountButton() {
  return (
    <Link
      href="/conta"
      aria-label="Minha conta"
      className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-olive-600"
    >
      <UserIcon className="h-5 w-5" />
    </Link>
  );
}
