import { forwardRef } from 'react';
import type { HTMLAttributes, ElementType } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const textStyles = cva('font-sans', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
    },
    tone: {
      default: 'text-ink',
      muted: 'text-ink-muted',
      inverse: 'text-white',
    },
    weight: {
      regular: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
  },
  defaultVariants: {
    size: 'base',
    tone: 'default',
    weight: 'regular',
  },
});

export interface TextProps
  extends HTMLAttributes<HTMLParagraphElement>, VariantProps<typeof textStyles> {
  as?: ElementType;
}

/** Texto de corpo em Inter — usado para descrições, legendas e UI copy. */
export const Text = forwardRef<HTMLParagraphElement, TextProps>(
  ({ as: Component = 'p', size, tone, weight, className, ...props }, ref) => (
    <Component ref={ref} className={cn(textStyles({ size, tone, weight }), className)} {...props} />
  ),
);

Text.displayName = 'Text';
