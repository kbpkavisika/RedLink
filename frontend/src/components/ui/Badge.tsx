import clsx from 'clsx';
import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-soft text-ink-2',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-primary-subtle text-primary',
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  // Always a word ("Pending", "Accepted"): status is never shown by colour alone
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-caption font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
