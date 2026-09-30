import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

type Size = 'sm' | 'md' | 'lg';

interface BaseProps extends ComponentProps<'button'> {
  size?: Size;
  leftIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

// Icon-only buttons must have an aria-label, so TypeScript requires it for that variant
type ButtonProps = BaseProps &
  (
    | { variant?: 'primary' | 'dark' | 'outline' | 'text' }
    | { variant: 'icon'; 'aria-label': string }
  );

const variants = {
  // The one main action per view
  primary: 'bg-primary text-white hover:bg-primary-hover',
  // Strong secondary next to an outline button
  dark: 'bg-ink text-white hover:bg-ink-2',
  // Secondary / back actions
  outline: 'border border-border-strong bg-surface text-ink hover:bg-bg',
  // Tertiary actions that read like a link
  text: 'text-primary hover:text-primary-hover',
  icon: 'size-9 rounded-md text-text-muted hover:bg-bg hover:text-ink',
};

const sizes = {
  sm: 'h-[38px] rounded-md px-3.5 text-label',
  md: 'h-10 rounded-md px-4 text-body',
  lg: 'h-12 rounded-lg px-5 text-body-input',
};

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  loading = false,
  fullWidth = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap select-none',
        'transition-colors duration-150 focus-visible:shadow-focus focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant !== 'icon' && variant !== 'text' && sizes[size],
        variants[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : leftIcon}
      {children}
    </button>
  );
}
