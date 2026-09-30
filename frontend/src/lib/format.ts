import type { BloodGroup } from '../types';

// The API sends "A-"; the UI shows the true minus sign "A−" (U+2212), as design.md requires
export function formatBloodGroup(group: BloodGroup): string {
  return group.replace('-', '−');
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// "2026-05-01" → "1 May 2026". Read as a calendar date, so the time zone can't shift the day.
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}
