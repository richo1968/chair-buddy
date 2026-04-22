import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-bg hover:brightness-110 active:brightness-110',
  secondary:
    'bg-surface-hi text-fg border border-border active:brightness-125',
  ghost: 'bg-transparent text-fg border border-border active:bg-surface-hi',
  danger: 'bg-danger text-white active:brightness-110'
};

const sizes: Record<Size, string> = {
  md: 'h-11 px-4 text-base',
  lg: 'h-14 px-5 text-lg min-h-tap',
  xl: 'h-16 px-6 text-xl min-h-tap'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = 'primary', size = 'lg', type = 'button', ...rest },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold',
          'transition-none disabled:opacity-40 disabled:cursor-not-allowed',
          'select-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...rest}
      />
    );
  }
);
