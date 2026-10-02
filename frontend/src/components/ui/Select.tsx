import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useId, type ComponentProps } from 'react';

interface SelectProps extends ComponentProps<'select'> {
  label: string;
  error?: string;
  hint?: string;
}

// A native <select> with the same label, hint and error layout as Input. Works with React Hook Form.
export function Select({ label, error, hint, id, className, children, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const messageId = `${selectId}-message`;
  const message = error ?? hint;

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={selectId} className="text-label font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={clsx(
            'h-12 w-full appearance-none rounded-lg border bg-surface pr-10 pl-3.5 text-body-input text-ink',
            'transition-[border-color,box-shadow] duration-150',
            'focus:border-primary focus:shadow-focus focus:outline-none',
            'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-subtle',
            error ? 'border-primary' : 'border-border-strong',
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-text-subtle"
        />
      </div>
      {message && (
        <p id={messageId} className={clsx('text-caption', error ? 'text-primary-hover' : 'text-text-subtle')}>
          {message}
        </p>
      )}
    </div>
  );
}
