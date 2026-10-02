import { revalidatePath } from 'next/cache';

/**
 * Depois de qualquer mudança de catálogo no admin (produto, marca,
 * categoria, coleção). Antes, as actions só invalidavam as telas do
 * próprio `/admin` — a loja continuava servindo preço/estoque/foto antigos
 * por até 5 minutos (cache de `catalog.service`/`product.service`), e um
 * produto excluído seguia aparecendo na vitrine. `'layout'` na raiz
 * invalida todas as páginas de uma vez: num catálogo deste tamanho, e com
 * edições raras, é mais simples e mais seguro que listar cada rota
 * afetada (home, PLP, PDP, coleções, sitemap...).
 *
 * Arquivo sem `'use server'` de propósito: é um helper chamado de dentro
 * das Server Actions, não uma action exposta ao navegador.
 */
export function revalidateStorefront(): void {
  revalidatePath('/', 'layout');
}
