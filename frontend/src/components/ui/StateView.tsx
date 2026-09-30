import clsx from 'clsx';
import { Check, Droplet, Lock, RefreshCw, SearchX, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ApiError } from '../../types';
import { Button } from './Button';
import { SkeletonRows } from './Skeleton';

export type ScreenState = 'loading' | 'empty' | 'no-results' | 'error' | 'success' | 'blocked';

interface StateViewProps {
  state: ScreenState;
  title?: string;
  description?: ReactNode;
  // Replaces the default icon for the state
  icon?: LucideIcon;
  // Main button. For "error" it defaults to "Try again" when onRetry is given.
  action?: ReactNode;
  // Secondary button (shown before the main one) or, for "empty", a text link below it
  secondaryAction?: ReactNode;
  // "error": the ApiError from the failed request; its ref is shown for support
  error?: ApiError;
  onRetry?: () => void;
  // "loading": number of skeleton rows
  rows?: number;
  // Extra content under the description, e.g. <StepProgress /> in the blocked state
  children?: ReactNode;
}

const defaults: Record<Exclude<ScreenState, 'loading'>, { icon: LucideIcon; title: string }> = {
  empty: { icon: Droplet, title: 'Nothing here yet' },
  'no-results': { icon: SearchX, title: 'No results match these filters' },
  error: { icon: TriangleAlert, title: "We couldn't load this" },
  success: { icon: Check, title: 'Done' },
  blocked: { icon: Lock, title: "This isn't available yet" },
};

const tiles = {
  empty: 'size-[72px] rounded-4xl bg-primary-soft text-primary',
  'no-results': 'size-16 rounded-3xl bg-bg text-text-subtle',
  error: 'size-16 rounded-3xl bg-primary-subtle text-primary',
  blocked: 'size-16 rounded-3xl bg-warning-soft text-warning',
  success: 'size-[72px] rounded-full bg-success-soft text-success shadow-halo-success',
};

/**
 * The six screen states every data view needs (design.md §5).
 * Put it in the same Panel as the loaded view so the layout doesn't jump.
 */
export function StateView({
  state,
  title,
  description,
  icon,
  action,
  secondaryAction,
  error,
  onRetry,
  rows,
  children,
}: StateViewProps) {
  if (state === 'loading') {
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading…</span>
        <SkeletonRows rows={rows} />
      </div>
    );
  }

  const Icon = icon ?? defaults[state].icon;
  const heading = title ?? defaults[state].title;
  const body = description ?? (state === 'error' ? error?.message : undefined);
  const mainAction =
    action ??
    (state === 'error' && onRetry ? (
      <Button onClick={onRetry} leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}>
        Try again
      </Button>
    ) : undefined);

  return (
    <div
      role={state === 'error' ? 'alert' : state === 'success' ? 'status' : undefined}
      className="flex flex-col items-center gap-3.5 p-10 text-center"
    >
      <div className={clsx('flex items-center justify-center', tiles[state])}>
        <Icon
          aria-hidden="true"
          size={state === 'empty' ? 36 : state === 'success' ? 34 : 30}
          className={state === 'success' ? 'stroke-2' : 'stroke-[1.5]'}
        />
      </div>

      <h3 className={state === 'empty' ? 'font-display text-title-lg text-ink' : 'text-title-md text-ink'}>
        {heading}
      </h3>

      {body && <p className="max-w-[290px] text-body text-text-muted">{body}</p>}

      {children}

      {state === 'empty' ? (
        (mainAction || secondaryAction) && (
          <div className="mt-1 flex flex-col items-center gap-2">
            {mainAction}
            {secondaryAction}
          </div>
        )
      ) : (
        (mainAction || secondaryAction) && (
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            {secondaryAction}
            {mainAction}
          </div>
        )
      )}

      {state === 'error' && error?.ref && (
        <p className="font-mono text-mono-sm text-text-subtle">
          Error {error.status || '—'} · ref {error.ref}
        </p>
      )}
    </div>
  );
}
