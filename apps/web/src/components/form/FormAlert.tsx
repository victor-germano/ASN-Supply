import type { ReactNode } from 'react';

type Tone = 'error' | 'success' | 'info';

const toneClassName: Record<Tone, string> = {
  error: 'border-error/40 bg-error/5 text-error',
  success: 'border-success/40 bg-success/5 text-success',
  info: 'border-ink/15 bg-bone-200 text-ink',
};

/**
 * Aviso no topo de um formulário — destacado de propósito (borda, fundo,
 * ícone), diferente do texto pequeno de erro por campo. `role="alert"` em
 * erro faz o leitor de tela anunciar na hora; sucesso/info usam `status`
 * (anunciado sem interromper).
 */
export function FormAlert({
  tone,
  title,
  children,
  id,
}: {
  tone: Tone;
  title?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div
      id={id}
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 border px-4 py-3 text-sm ${toneClassName[tone]}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 h-4 w-4 shrink-0"
      >
        {tone === 'success' ? (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.86a.75.75 0 0 0-1.22-.88l-3.4 4.72-1.73-1.73a.75.75 0 1 0-1.06 1.06l2.36 2.37a.75.75 0 0 0 1.14-.1l3.9-5.44Z"
            clipRule="evenodd"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-12a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        )}
      </svg>
      <div>
        {title && <p className="font-medium">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
