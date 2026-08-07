import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  /** Reduz o espaçamento vertical padrão (seções mais compactas, ex: benefícios). */
  spacing?: 'default' | 'compact';
}

/**
 * Wrapper semântico <section> com o ritmo vertical padrão da Home e páginas
 * institucionais — evita que cada feature reimplemente o mesmo padding.
 */
export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ className, spacing = 'default', ...props }, ref) => (
    <section
      ref={ref}
      className={cn(spacing === 'default' ? 'py-section' : 'py-14', className)}
      {...props}
    />
  ),
);

Section.displayName = 'Section';
