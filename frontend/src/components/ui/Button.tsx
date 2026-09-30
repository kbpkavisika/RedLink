import { Loader2 } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { buttonClasses, type ButtonSize } from './buttonStyles';

interface BaseProps extends ComponentProps<'button'> {
  size?: ButtonSize;
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
      className={buttonClasses(variant, size, fullWidth, className)}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : leftIcon}
      {children}
    </button>
  );
}
