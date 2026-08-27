import { LogoMark } from '@/components/LogoMark';

/**
 * `<main>` compartilhado por `/entrar`, `/criar-conta` e `/admin/entrar` —
 * mesmo fundo bege de sempre, com a marca da ASN em opacidade quase
 * imperceptível atrás do formulário (pedido do usuário: "algo BEM sutil,
 * quase imperceptível", não um selo d'água chamativo). `pointer-events-none`
 * e `aria-hidden` porque é puramente decorativo — nunca deve interceptar
 * clique nem ser anunciado por leitor de tela. `overflow-hidden` no `<main>`
 * evita que a marca (bem maior que a viewport, de propósito) empurre a
 * página e crie scroll horizontal.
 */
export function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative overflow-hidden bg-bone-100">
      <LogoMark
        aria-hidden="true"
        className="pointer-events-none absolute -right-[15%] -top-[10%] h-[140%] w-auto text-ink opacity-[0.035]"
      />
      <div className="relative">{children}</div>
    </main>
  );
}
