'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  /** Atraso em segundos — usado para escalonar itens de um grid (efeito stagger). */
  delay?: number;
  /** Distância em pixels que o elemento percorre verticalmente ao revelar. */
  distance?: number;
}

/**
 * Microinteração padrão de "aparecer ao rolar" usada em toda a Home e
 * páginas de listagem. Dispara uma única vez (não reanima ao rolar de
 * volta) e respeita `prefers-reduced-motion` via `viewport.once` + a
 * ausência de qualquer efeito parallax aqui (só opacidade/posição).
 */
export function RevealOnScroll({
  children,
  className,
  delay = 0,
  distance = 24,
}: RevealOnScrollProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
