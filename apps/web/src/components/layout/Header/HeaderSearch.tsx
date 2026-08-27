'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { SearchIcon, CloseIcon } from '@/components/icons';

/**
 * Busca acessível de qualquer página (não só `/produtos`, onde já existe a
 * `SearchBar` da PLP — essa lê/escreve `?q=` na própria URL da listagem,
 * não serve fora dela). Ícone + painel que desliza abaixo do header, em
 * vez de um campo permanente no meio do nav: o `Header` já é sensível a
 * largura (ver comentário lá sobre o nav ter crescido o bastante pra
 * colidir com a logo) — um input fixo ali só pioraria isso.
 */
export function HeaderSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    router.push(`/produtos?q=${encodeURIComponent(query)}`);
    setIsOpen(false);
    setValue('');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Fechar busca' : 'Buscar produtos'}
        aria-expanded={isOpen}
        className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-olive-600"
      >
        {isOpen ? <CloseIcon className="h-5 w-5" /> : <SearchIcon className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="search-panel"
            className="absolute inset-x-0 top-full z-30 border-b border-ink/10 bg-bone-100 shadow-sm"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-2xl items-center gap-3 px-gutter py-4"
            >
              <SearchIcon className="h-5 w-5 shrink-0 text-ink-muted" />
              <label htmlFor="header-search" className="sr-only">
                Buscar produtos
              </label>
              <input
                ref={inputRef}
                id="header-search"
                type="search"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Buscar tênis, marca ou estilo..."
                className="h-10 flex-1 border-0 bg-transparent text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none"
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
