import type { NotificationItem, Role } from '../types';
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
const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

// "Just now", "5 min ago", "3 h ago", "2 days ago", then "6 Oct"
export function timeAgo(iso: string, now = Date.now()): string {
  const elapsed = now - new Date(iso).getTime();
  if (elapsed < MINUTE) return 'Just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`;
  if (elapsed < 7 * DAY) {
    const days = Math.floor(elapsed / DAY);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  return shortDate.format(new Date(iso));
}
