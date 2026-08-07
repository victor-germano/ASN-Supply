import Link from 'next/link';
import { Heading, Text, buttonStyles } from '@asn/ui';

export function EmptyState({ href }: { href: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <Heading as="h2" size="sm">
        Nenhum produto encontrado
      </Heading>
      <Text tone="muted" className="max-w-sm">
        Tente remover algum filtro ou buscar por outro termo.
      </Text>
      <Link href={href} className={buttonStyles({ size: 'sm' })}>
        Limpar filtros
      </Link>
    </div>
  );
}
