import clsx from 'clsx';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  // Shown after the label, e.g. how many items the option has
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  // Read by screen readers, e.g. "Filter hospitals by status"
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

// A row of mutually exclusive filter buttons, e.g. Pending · Approved · Rejected · All
export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-neutral-soft p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={clsx(
              'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-label font-semibold transition-colors',
              'focus-visible:shadow-focus focus-visible:outline-none',
              selected ? 'bg-surface text-ink shadow-sm' : 'text-text-muted hover:text-ink',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={clsx(
                  'min-w-5 rounded-full px-1.5 text-caption',
                  selected ? 'bg-primary-soft text-primary-hover' : 'bg-surface/70 text-text-subtle',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
