import clsx from 'clsx';
import { useId, type ComponentProps } from 'react';

interface TextareaProps extends ComponentProps<'textarea'> {
  label: string;
  error?: string;
  hint?: string;
}

// Multi-line text with the same label, hint and error layout as Input. Works with React Hook Form.
export function Textarea({ label, error, hint, id, className, rows = 4, ...rest }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const messageId = `${textareaId}-message`;
  const message = error ?? hint;

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={textareaId} className="text-label font-medium text-ink">
        {label}
      </label>
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={clsx(
          'w-full resize-y rounded-lg border bg-surface px-3.5 py-3 text-body-input text-ink',
          'transition-[border-color,box-shadow] duration-150',
          'focus:border-primary focus:shadow-focus focus:outline-none',
          'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-subtle',
          error ? 'border-primary' : 'border-border-strong',
        )}
        {...rest}
      />
      {message && (
        <p id={messageId} className={clsx('text-caption', error ? 'text-primary-hover' : 'text-text-subtle')}>
          {message}
        </p>
      )}
    </div>
  );
}
