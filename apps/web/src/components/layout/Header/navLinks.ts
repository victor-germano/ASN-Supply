export interface NavLink {
  label: string;
  href: string;
}

/**
 * Navegação principal do site. "Todos os Produtos" foi para a rota real da
 * PLP (Módulo 2); "Lançamentos"/"Mais Vendidos"/"Sobre" continuam como
 * âncoras porque são seções curadas da própria Home, não filtros da
 * listagem — não faria sentido linká-las para /produtos.
 */
export const NAV_LINKS: NavLink[] = [
  { label: 'Todos os Produtos', href: '/produtos' },
  { label: 'Lançamentos', href: '/#lancamentos' },
  { label: 'Mais Vendidos', href: '/#mais-vendidos' },
  { label: 'Sobre', href: '/#sobre' },
];
