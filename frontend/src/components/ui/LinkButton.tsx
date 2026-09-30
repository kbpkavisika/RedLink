import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

interface LinkButtonProps extends LinkProps {
  variant?: Exclude<ButtonVariant, 'icon'>;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
}

// Navigation that looks like a button, e.g. "New request", "Back to requests"
export function LinkButton({
  variant = 'primary',
  size = 'md',
  leftIcon,
  fullWidth = false,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={buttonClasses(variant, size, fullWidth, typeof className === 'string' ? className : undefined)} {...rest}>
      {leftIcon}
      {children}
    </Link>
  );
}
