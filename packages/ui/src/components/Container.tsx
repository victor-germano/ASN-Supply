import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Remove o padding horizontal (útil para carrosséis edge-to-edge). */
  disableGutter?: boolean;
}

/**
 * Envelope de largura máxima usado em toda a aplicação para manter a
 * identidade "muito espaço em branco" consistente entre seções.
 */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, disableGutter = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mx-auto w-full max-w-content', !disableGutter && 'px-gutter', className)}
      {...props}
    />
  ),
);

Container.displayName = 'Container';
