import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

export const buttonStyles = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-sans uppercase tracking-wider text-xs font-medium',
    'transition-colors duration-300 ease-premium',
    'disabled:pointer-events-none disabled:opacity-40',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-ink text-white hover:bg-ink-soft',
        secondary: 'border border-ink text-ink hover:bg-ink hover:text-white',
        ghost: 'text-ink hover:bg-bone-200',
        link: 'text-ink underline-offset-4 hover:underline p-0 normal-case tracking-normal',
      },
      size: {
        sm: 'h-9 px-4',
        md: 'h-12 px-7',
        lg: 'h-14 px-9 text-sm',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    compoundVariants: [{ variant: 'link', size: ['sm', 'md', 'lg'], class: 'h-auto px-0' }],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

/**
 * Botão de ação primário do design system. Cobre CTAs de compra, envio de
 * formulário e ações secundárias — sempre com estado de foco visível e
 * suporte a estado de carregamento (evita duplo-clique em checkout).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      leadingIcon,
      trailingIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonStyles({ variant, size, fullWidth }), className)}
        disabled={disabled ?? isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            role="status"
            aria-label="Carregando"
          />
        ) : (
          leadingIcon
        )}
        {children}
        {!isLoading && trailingIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
