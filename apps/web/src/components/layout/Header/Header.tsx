import Link from 'next/link';
import { Container } from '@asn/ui';
import { CartButton } from './CartButton';
import { WishlistButton } from './WishlistButton';
import { MobileMenu } from './MobileMenu';
import { NAV_LINKS } from './navLinks';

/**
 * Chrome global fixo no topo. Server Component — só os pedaços realmente
 * interativos (menu mobile, badge do carrinho) são client components à parte.
 *
 * Flex `justify-between` com o logo como irmão normal no fluxo (não
 * `position: absolute` centralizado): um logo absoluto fica fora do
 * fluxo, então nada impede o nav (começando da borda esquerda, em fluxo
 * normal) de crescer até colidir com ele — foi exatamente o que aconteceu
 * ao entrar "Provador" no menu, quando o nav ficou largo o bastante para
 * alcançar o centro. Como irmão flex normal, o logo nunca é sobreposto
 * (flexbox distribui os três grupos sem overlap); em troca, ele só fica
 * *visualmente* centralizado quando nav e carrinho têm larguras
 * parecidas — um preço aceitável por nunca quebrar com mais um link.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-bone-100/90 backdrop-blur-sm">
      <Container className="flex h-20 items-center justify-between gap-4">
        <div className="flex items-center gap-2 lg:hidden">
          <MobileMenu links={NAV_LINKS} />
        </div>

        <nav aria-label="Menu principal" className="hidden lg:block">
          <ul className="flex items-center gap-6 whitespace-nowrap">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-sans text-xs uppercase tracking-wider text-ink transition-colors hover:text-olive-600"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link href="/" className="font-display text-2xl tracking-tight text-ink">
          ASN SUPPLY
        </Link>

        <div className="flex items-center">
          <WishlistButton />
          <CartButton />
        </div>
      </Container>
    </header>
  );
}
