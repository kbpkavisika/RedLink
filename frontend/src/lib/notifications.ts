import i18n from '../i18n';
import type { NotificationItem, Role } from '../types';
import { formatDayMonth } from './format';
import { homePathFor } from './roles';

/**
 * Where a notification takes you when you open it:
 *   about a request → staff: that request's page; donors: their requests page, scrolled to it
 *   anything else (e.g. a hospital decision) → your dashboard
 * Admins have no request page, so theirs always go to their dashboard.
 */
export function notificationLink(item: NotificationItem, role: Role): string {
  if (item.requestId !== null) {
    if (role === 'HOSPITAL_STAFF') return `/hospital/requests/${item.requestId}`;
    if (role === 'DONOR') return `/donor/requests#${item.reference}`;
  }
  return homePathFor(role);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// "Just now", "5 min ago", "3 h ago", "2 days ago", then "6 Oct", in the chosen language
export function timeAgo(iso: string, now = Date.now()): string {
  const elapsed = now - new Date(iso).getTime();
  if (elapsed < MINUTE) return i18n.t('time.justNow');
  if (elapsed < HOUR) return i18n.t('time.minutesAgo', { count: Math.floor(elapsed / MINUTE) });
  if (elapsed < DAY) return i18n.t('time.hoursAgo', { count: Math.floor(elapsed / HOUR) });
  if (elapsed < 7 * DAY) return i18n.t('time.daysAgo', { count: Math.floor(elapsed / DAY) });
  return formatDayMonth(iso);
}
