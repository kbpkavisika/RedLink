import clsx from 'clsx';
import { useId, type ReactNode } from 'react';

interface PanelProps {
  title?: ReactNode;
  // Right side of the header: buttons, filters
  actions?: ReactNode;
  // Adds inner padding; leave off for tables and state views that fill the panel
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

// The container for all data: white surface, 1px border, radius 14, no shadow
export function Panel({ title, actions, padded = false, className, children }: PanelProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={clsx('overflow-hidden rounded-2xl border border-border bg-surface', className)}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-[18px]">
          {title && (
            <h2 id={titleId} className="text-body-lg font-semibold text-ink">
              {title}
            </h2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(padded && 'p-5')}>{children}</div>
    </section>
  );
}
