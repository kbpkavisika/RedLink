import clsx from 'clsx';
import { useId } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  // Helper line, e.g. "Turn off while travelling or unwell"
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p id={`${id}-label`} className="text-body font-semibold text-ink">
          {label}
        </p>
        {description && (
          <p id={`${id}-description`} className="text-caption text-text-subtle">
            {description}
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-8 w-[52px] shrink-0 rounded-full p-[3px] transition-colors duration-150',
          'focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-success' : 'bg-border-strong',
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'size-[26px] rounded-full bg-white shadow-knob transition-transform duration-150',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}
