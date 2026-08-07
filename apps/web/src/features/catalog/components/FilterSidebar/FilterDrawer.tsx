'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloseIcon } from '@/components/icons';

/**
 * Recebe o `FilterSidebar` (Server Component) como `children` — o drawer só
 * controla abrir/fechar no mobile, o conteúdo dos filtros continua
 * renderizado no servidor. Fecha automaticamente quando a navegação troca a
 * URL (o usuário aplicou um filtro), sem precisar de lógica extra.
 */
export function FilterDrawer({
  children,
  resultCount,
}: {
  children: ReactNode;
  resultCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [resultCount]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-11 items-center gap-2 border border-ink/15 px-4 text-xs uppercase tracking-wider text-ink lg:hidden"
      >
        Filtrar
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 z-50 bg-ink/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              key="drawer"
              role="dialog"
              aria-label="Filtros"
              className="fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-sm flex-col overflow-y-auto bg-bone-50 px-gutter py-8 shadow-xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar filtros"
                className="mb-6 flex h-10 w-10 items-center justify-center self-end text-ink"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
