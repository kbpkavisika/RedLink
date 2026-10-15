import { z } from 'zod';
import { msg } from './messages';

// Form rules that mirror the backend's checks, so most mistakes are caught before the request is sent.
// The backend still checks everything; its field errors are shown with applyFieldErrors.
// Messages are translation keys (msg), translated by the input that shows them.

export const fullNameField = z.string().trim().min(1, msg('enterFullName')).max(150, msg('tooLong', 150));

export const emailField = z
  .string()
  .trim()
  .min(1, msg('enterEmail'))
  .max(255, msg('tooLong', 255))
  .pipe(z.email(msg('validEmail')));

// Sri Lankan phone: spaces and dashes are removed, then 10 digits starting with 0 (backend: Inputs.PHONE_PATTERN)
export const phoneField = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^0\d{9}$/, msg('phone')));

// BCrypt only uses the first 72 bytes, so the backend allows 8–72 characters
export const newPasswordField = z.string().min(8, msg('tooShort', 8)).max(72, msg('tooLong', 72));

export const cityField = z.string().trim().min(1, msg('enterCity')).max(100, msg('tooLong', 100));

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
