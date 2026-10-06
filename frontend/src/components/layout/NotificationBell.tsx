import clsx from 'clsx';
import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useMarkAllRead, useMarkRead, useNotifications } from '../../hooks/useNotifications';
import { notificationLink, timeAgo } from '../../lib/notifications';
import type { NotificationItem } from '../../types';

// How many the dropdown shows; the full list is on /notifications
const PREVIEW = 8;

/**
 * The bell in the top bar (S4, D11): unread count, the latest notifications, and "Mark all as read".
 * Opening a notification marks it read and goes to what it's about (see notificationLink).
 */
export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on a click outside or on Escape, like the user menu
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const unread = data?.unreadCount ?? 0;
  const items = data?.items.slice(0, PREVIEW) ?? [];

  const openItem = (item: NotificationItem) => {
    if (!item.read) markRead.mutate(item.id);
    setOpen(false);
    navigate(notificationLink(item, user.role));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-10 items-center justify-center rounded-md text-text-muted hover:bg-bg hover:text-ink focus-visible:shadow-focus focus-visible:outline-none"
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-caption leading-none font-semibold text-white ring-2 ring-surface"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute top-full right-0 z-30 mt-2 flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-body font-semibold text-ink">
              Notifications{unread > 0 && <span className="font-normal text-text-subtle"> · {unread} unread</span>}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="hit-target relative inline-flex items-center gap-1 text-label font-semibold text-primary hover:text-primary-hover"
              >
                <CheckCheck size={14} aria-hidden="true" />
                Mark all as read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-label text-text-subtle">
              {data ? "You're all caught up. New notifications appear here." : 'Loading…'}
            </p>
          ) : (
            <ul className="max-h-[420px] divide-y divide-neutral-soft overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={clsx(
                      'flex w-full gap-3 px-4 py-3 text-left hover:bg-bg focus-visible:bg-bg focus-visible:outline-none',
                      !item.read && 'bg-primary-soft/40',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={clsx('mt-1.5 size-2 shrink-0 rounded-full', item.read ? 'bg-transparent' : 'bg-primary')}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={clsx('text-label', item.read ? 'text-text-muted' : 'font-medium text-ink')}>
                        {!item.read && <span className="sr-only">Unread: </span>}
                        {item.message}
                      </span>
                      <span className="text-caption text-text-subtle">{timeAgo(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="border-t border-border px-4 py-3 text-center text-label font-semibold text-primary no-underline hover:bg-bg hover:text-primary-hover"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
