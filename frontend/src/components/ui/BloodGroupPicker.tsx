import clsx from 'clsx';
import { useId } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { formatBloodGroup } from '../../lib/format';
import { BLOOD_GROUPS } from '../../types';

interface BloodGroupPickerProps {
  legend: string;
  error?: string;
  hint?: string;
  // From React Hook Form: <BloodGroupPicker {...register('bloodGroup')} />
  registration: UseFormRegisterReturn;
}

// The 8 blood groups as one radio group of tiles. Arrow keys move between them, like any radio group.
export function BloodGroupPicker({ legend, error, hint, registration }: BloodGroupPickerProps) {
  const messageId = useId();
  const message = error ?? hint;

  return (
    <fieldset aria-describedby={message ? messageId : undefined} className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-label font-medium text-ink">{legend}</legend>
      <div className="grid grid-cols-4 gap-2">
        {BLOOD_GROUPS.map((group) => (
          <label key={group} className="cursor-pointer">
            <input type="radio" value={group} className="peer sr-only" {...registration} />
            <span
              className={clsx(
                'flex h-11 items-center justify-center rounded-lg border bg-surface font-display text-title-md text-ink',
                'transition-colors duration-150 hover:border-primary',
                'peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary-hover',
                'peer-focus-visible:shadow-focus',
                error ? 'border-primary' : 'border-border-strong',
              )}
            >
              {formatBloodGroup(group)}
            </span>
          </label>
        ))}
      </div>
      {message && (
        <p id={messageId} className={clsx('text-caption', error ? 'text-primary-hover' : 'text-text-subtle')}>
          {message}
        </p>
      )}
    </fieldset>
  );
}
