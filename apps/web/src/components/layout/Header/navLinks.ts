export interface NavLink {
  label: string;
  href: string;
}

/**
 * Navegação principal do site. Aponta para âncoras da Home porque, até o
 * Módulo 2 (Listagem de Produtos) existir, não há rotas de categoria reais
 * para linkar — preferível a apontar para páginas que ainda não existem.
 */
export const NAV_LINKS: NavLink[] = [
  { label: 'Lançamentos', href: '/#lancamentos' },
  { label: 'Mais Vendidos', href: '/#mais-vendidos' },
  { label: 'Coleções', href: '/#colecoes' },
  { label: 'Sobre', href: '/#sobre' },
];
