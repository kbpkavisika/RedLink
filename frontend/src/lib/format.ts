import type { BloodGroup } from '../types';

// The API sends "A-"; the UI shows the true minus sign "A−" (U+2212), as design.md requires
export function formatBloodGroup(group: BloodGroup): string {
  return group.replace('-', '−');
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// A moment from the API ("2026-09-30T06:00:00Z") in the viewer's time zone → "1 Oct 2026" or "1 Oct 2026, 11:30"
export function formatInstant(iso: string, withTime = false): string {
  const date = new Date(iso);
  return withTime ? dateTimeFormat.format(date) : dateFormat.format(date);
}

// "2026-05-01" → "1 May 2026". Read as a calendar date, so the time zone can't shift the day.
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}
