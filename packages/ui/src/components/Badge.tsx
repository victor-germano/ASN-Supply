import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const badgeStyles = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 font-sans text-[10px] font-medium uppercase tracking-wider',
  {
    variants: {
      tone: {
        neutral: 'bg-bone-200 text-ink',
        // olive-500 contra branco fica em 3.99:1 (abaixo do mínimo AA de
        // 4.5:1 para texto pequeno) — olive-700 garante contraste seguro.
        olive: 'bg-olive-700 text-white',
        outline: 'border border-ink/20 text-ink',
        error: 'bg-error/10 text-error',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeStyles> {}

/** Selo curto usado em cards de produto ("Novo", "-20%", "Esgotado"). */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, ...props }, ref) => (
    <span ref={ref} className={cn(badgeStyles({ tone }), className)} {...props} />
  ),
);

Badge.displayName = 'Badge';
