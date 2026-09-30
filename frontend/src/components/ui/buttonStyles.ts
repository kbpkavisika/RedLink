import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'dark' | 'outline' | 'text' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  // The one main action per view
  primary: 'bg-primary text-white hover:bg-primary-hover hover:text-white',
  // Strong secondary next to an outline button
  dark: 'bg-ink text-white hover:bg-ink-2 hover:text-white',
  // Secondary / back actions
  outline: 'border border-border-strong bg-surface text-ink hover:bg-bg hover:text-ink',
  // Tertiary actions that read like a link
  text: 'text-primary hover:text-primary-hover',
  icon: 'size-9 rounded-md text-text-muted hover:bg-bg hover:text-ink',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-[38px] rounded-md px-3.5 text-label',
  md: 'h-10 rounded-md px-4 text-body',
  lg: 'h-12 rounded-lg px-5 text-body-input',
};

// Shared by <Button> and <LinkButton> so a link can look exactly like a button
export function buttonClasses(variant: ButtonVariant, size: ButtonSize, fullWidth = false, className?: string) {
  return clsx(
    'inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap no-underline select-none',
    'transition-colors duration-150 focus-visible:shadow-focus focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variant !== 'icon' && variant !== 'text' && sizes[size],
    variants[variant],
    fullWidth && 'w-full',
    className,
  );
}
