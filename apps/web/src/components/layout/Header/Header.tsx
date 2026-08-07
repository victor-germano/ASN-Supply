import Link from 'next/link';
import { Container } from '@asn/ui';
import { CartButton } from './CartButton';
import { MobileMenu } from './MobileMenu';
import { NAV_LINKS } from './navLinks';

/**
 * Chrome global fixo no topo. Server Component — só os pedaços realmente
 * interativos (menu mobile, badge do carrinho) são client components à parte.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-bone-100/90 backdrop-blur-sm">
      <Container className="flex h-20 items-center justify-between">
        <div className="flex items-center gap-2 lg:hidden">
          <MobileMenu links={NAV_LINKS} />
        </div>

        <Link
          href="/"
          className="font-display text-2xl tracking-tight text-ink lg:absolute lg:left-1/2 lg:-translate-x-1/2"
        >
          ASN SUPPLY
        </Link>

        <nav aria-label="Menu principal" className="hidden lg:block">
          <ul className="flex items-center gap-10">
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

        <div className="flex items-center">
          <CartButton />
        </div>
      </Container>
    </header>
  );
}
