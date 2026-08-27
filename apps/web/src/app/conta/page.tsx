import { redirect } from 'next/navigation';

/**
 * Ponto de entrada neutro para o link do header (`AccountButton`): quem
 * chega aqui já passou pelo `conta/layout.tsx` (autenticado, senão já foi
 * redirecionado para /entrar) — só falta escolher a primeira sub-página.
 */
export default function ContaIndexPage() {
  redirect('/conta/pedidos');
}
