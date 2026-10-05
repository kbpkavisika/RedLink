import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  // Read by screen readers, e.g. "Blood group"
  label: string;
  // What "no filter" is called, e.g. "All blood groups"
  allLabel: string;
  options: FilterOption[];
  // '' = no filter
  value: string;
  onChange: (value: string) => void;
}

// A compact dropdown filter for table toolbars. Tinted while a value is chosen, so active filters stand out.
export function FilterSelect({ label, allLabel, options, value, onChange }: FilterSelectProps) {
  const active = value !== '';
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          'h-10 appearance-none rounded-lg border pr-9 pl-3 text-body font-medium',
          'focus:border-primary focus:shadow-focus focus:outline-none',
          active ? 'border-primary bg-primary-soft text-primary-hover' : 'border-border-strong bg-surface text-ink',
        )}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className={clsx(
          'pointer-events-none absolute top-1/2 right-3 -translate-y-1/2',
          active ? 'text-primary-hover' : 'text-text-subtle',
        )}
      />
    </div>
  );
}
