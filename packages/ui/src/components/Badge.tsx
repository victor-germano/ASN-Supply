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
        olive: 'bg-olive-500 text-white',
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
