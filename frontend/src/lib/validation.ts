import { z } from 'zod';

// Form rules that mirror the backend's checks, so most mistakes are caught before the request is sent.
// The backend still checks everything; its field errors are shown with applyFieldErrors.

export const fullNameField = z.string().trim().min(1, 'Enter your full name').max(150, 'Use at most 150 characters');

export const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your email')
  .max(255, 'Use at most 255 characters')
  .pipe(z.email('Enter a valid email, e.g. name@example.lk'));

// Sri Lankan phone: spaces and dashes are removed, then 10 digits starting with 0 (backend: Inputs.PHONE_PATTERN)
export const phoneField = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^0\d{9}$/, 'Enter 10 digits starting with 0, e.g. 0771234567'));

// BCrypt only uses the first 72 bytes, so the backend allows 8–72 characters
export const newPasswordField = z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters');

export const cityField = z.string().trim().min(1, 'Enter your city').max(100, 'Use at most 100 characters');

/** Whole years between a "YYYY-MM-DD" birth date and today, counted the same way as Java's Period.between. */
export function ageOn(dateOfBirth: string, today: Date = new Date()): number {
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  const hadBirthdayThisYear =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  return today.getFullYear() - year - (hadBirthdayThisYear ? 0 : 1);
}

// "YYYY-MM-DD" for a local date, e.g. for the max attribute of a date input
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
