import { currentLocale } from '../i18n';
import type { BloodGroup } from '../types';

// The API sends "A-"; the UI shows the true minus sign "A−" (U+2212), as design.md requires
export function formatBloodGroup(group: BloodGroup): string {
  return group.replace('-', '−');
}

// Dates follow the chosen language (en-GB, si-LK, ta-LK). Formatters are made once per language.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(kind: 'date' | 'dateTime' | 'dayMonth'): Intl.DateTimeFormat {
  const locale = currentLocale();
  const key = `${locale}|${kind}`;
  let format = formatters.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      ...(kind !== 'dayMonth' && { year: 'numeric' }),
      ...(kind === 'dateTime' && { hour: '2-digit', minute: '2-digit' }),
    });
    formatters.set(key, format);
  }
  return format;
}

// A moment from the API ("2026-09-30T06:00:00Z") in the viewer's time zone → "1 Oct 2026" or "1 Oct 2026, 11:30"
export function formatInstant(iso: string, withTime = false): string {
  return formatter(withTime ? 'dateTime' : 'date').format(new Date(iso));
}

// "2026-05-01" → "1 May 2026". Read as a calendar date, so the time zone can't shift the day.
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return formatter('date').format(new Date(year, month - 1, day));
}

// "6 Oct": a date in the last year, where the year goes without saying
export function formatDayMonth(iso: string): string {
  return formatter('dayMonth').format(new Date(iso));
}
