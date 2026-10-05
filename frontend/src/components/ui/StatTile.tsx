import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface StatTileProps {
  label: string;
  value: number;
  icon: LucideIcon;
  // "alert" tints the tile red while the number is above zero (e.g. critical requests still open)
  tone?: 'neutral' | 'alert' | 'success';
  hint?: string;
}

// One dashboard number: icon, big value, label underneath
export function StatTile({ label, value, icon: Icon, tone = 'neutral', hint }: StatTileProps) {
  const alert = tone === 'alert' && value > 0;
  return (
    <div
      className={clsx(
        'flex items-center gap-4 rounded-2xl border p-5',
        alert ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
      )}
    >
      <span
        className={clsx(
          'flex size-11 shrink-0 items-center justify-center rounded-xl',
          alert ? 'bg-primary text-white' : tone === 'success' ? 'bg-success-soft text-success' : 'bg-bg text-ink-2',
        )}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className={clsx('font-display text-display-sm leading-none', alert ? 'text-primary-hover' : 'text-ink')}>
          {value}
        </p>
        <p className="mt-1 text-label text-text-muted">{label}</p>
        {hint && <p className="text-caption text-text-subtle">{hint}</p>}
      </div>
    </div>
  );
}
