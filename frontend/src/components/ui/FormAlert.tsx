import clsx from 'clsx';
import type { ReactNode } from 'react';

interface FormAlertProps {
  // error: the request failed (announced straight away); info: a note about the form
  tone?: 'error' | 'info';
  children: ReactNode;
}

// A message above a form, e.g. "Email or password is incorrect." Renders nothing without children.
export function FormAlert({ tone = 'error', children }: FormAlertProps) {
  if (!children) return null;
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx(
        'rounded-lg px-4 py-3 text-label',
        tone === 'error' ? 'bg-primary-subtle text-primary-hover' : 'bg-info-soft text-info',
      )}
    >
      {children}
    </p>
  );
}
