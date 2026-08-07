import { forwardRef } from 'react';
import type { HTMLAttributes, ElementType } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const headingStyles = cva('font-display text-ink', {
  variants: {
    size: {
      display: 'text-5xl leading-[1.05] tracking-tightest md:text-7xl',
      xl: 'text-4xl leading-[1.1] tracking-tight md:text-5xl',
      lg: 'text-3xl leading-tight tracking-tight md:text-4xl',
      md: 'text-2xl leading-tight md:text-3xl',
      sm: 'text-xl leading-snug md:text-2xl',
    },
    weight: {
      regular: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
  },
  defaultVariants: {
    size: 'lg',
    weight: 'medium',
  },
});

export interface HeadingProps
  extends HTMLAttributes<HTMLHeadingElement>, VariantProps<typeof headingStyles> {
  /** Nível semântico do heading (h1–h6), independente do tamanho visual. */
  as?: ElementType;
}

/**
 * Título tipográfico em Cormorant Garamond. O nível semântico (`as`) é
 * desacoplado do tamanho visual (`size`) para preservar a hierarquia de
 * acessibilidade sem amarrar o design a <h1>...<h6> sequenciais.
 */
export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as: Component = 'h2', size, weight, className, ...props }, ref) => (
    <Component ref={ref} className={cn(headingStyles({ size, weight }), className)} {...props} />
  ),
);

Heading.displayName = 'Heading';
