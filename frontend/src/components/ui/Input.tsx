import clsx from 'clsx';
import { useId, type ComponentProps, type ReactNode } from 'react';

interface InputProps extends ComponentProps<'input'> {
  label: string;
  // Says how to fix it, e.g. "Enter a hospital email, e.g. name@hospital.lk"
  error?: string;
  hint?: string;
  // Right-aligned in the label row, e.g. a "Forgot password?" link
  labelAction?: ReactNode;
  // Inside the field on the right, e.g. a show-password icon button
  rightSlot?: ReactNode;
}

// Works with React Hook Form: <Input label="Email" {...register('email')} error={errors.email?.message} />
export function Input({ label, error, hint, labelAction, rightSlot, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-label font-medium text-ink">
          {label}
        </label>
        {labelAction && <div className="text-label font-semibold [&_a]:no-underline">{labelAction}</div>}
      </div>

      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={clsx(
            'h-12 w-full rounded-lg border bg-surface px-3.5 text-body-input text-ink',
            'transition-[border-color,box-shadow] duration-150',
            'focus:border-primary focus:shadow-focus focus:outline-none',
            'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-subtle',
            error ? 'border-primary' : 'border-border-strong',
            rightSlot && 'pr-12',
          )}
          {...rest}
        />
        {rightSlot && <div className="absolute top-1/2 right-1.5 -translate-y-1/2">{rightSlot}</div>}
      </div>

      {message && (
        <p id={messageId} className={clsx('text-caption', error ? 'text-primary-hover' : 'text-text-subtle')}>
          {message}
        </p>
      )}
    </div>
  );
}
