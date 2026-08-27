'use client';

import Link from 'next/link';
import { Text, buttonStyles } from '@asn/ui';
import { useCompareStore } from '@/stores/compareStore';

/**
 * Barra fixa no rodapé da tela, global (montada no layout raiz) — some
 * sozinha com 0 ou 1 item selecionado (comparar exige pelo menos 2).
 * Persiste entre páginas de propósito: o usuário pode selecionar um
 * produto na PLP, continuar navegando, e a seleção continua visível até
 * ele decidir comparar ou limpar.
 */
export function CompareBar() {
  const hasHydrated = useCompareStore((state) => state.hasHydrated);
  const items = useCompareStore((state) => state.items);
  const clear = useCompareStore((state) => state.clear);
  const remove = useCompareStore((state) => state.remove);

  if (!hasHydrated || items.length < 2) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-bone-50 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-gutter py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Text size="sm" weight="medium" className="mr-1">
            Comparar ({items.length}):
          </Text>
          {items.map((item) => (
            <span
              key={item.id}
              className="flex items-center gap-1.5 border border-ink/15 py-1 pl-3 pr-1.5 text-xs"
            >
              {item.name}
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remover ${item.name} da comparação`}
                className="text-ink-muted hover:text-error"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={clear}
            className="text-xs text-ink-muted underline underline-offset-4"
          >
            Limpar
          </button>
          <Link href="/comparar" className={buttonStyles({ size: 'sm' })}>
            Comparar
          </Link>
        </div>
      </div>
    </div>
  );
}
