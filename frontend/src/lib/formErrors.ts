import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '../types';

/**
 * Shows the backend's fieldErrors under the matching inputs, e.g. a 409 on "email".
 * Returns true if at least one error landed on a field; otherwise show error.message above the form.
 * Nested backend names ("staff.email") match nested form fields of the same name.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  let applied = false;
  for (const fieldError of error.fieldErrors) {
    const field = fields.find((name) => name === fieldError.field);
    if (field) {
      setError(field, { type: 'server', message: capitalize(fieldError.message) }, { shouldFocus: !applied });
      applied = true;
    }
  }
  return applied;
}

// Backend field messages are lowercase fragments ("is already registered")
function capitalize(message: string): string {
  return message.charAt(0).toUpperCase() + message.slice(1);
}
