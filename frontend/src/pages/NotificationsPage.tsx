import clsx from 'clsx';
import { BellOff, CheckCheck, ChevronRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button, FilterBar, FilterSelect, Panel, SearchInput, StateView } from '../components/ui';
import { useMarkAllRead, useMarkRead, useNotifications } from '../hooks/useNotifications';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { formatInstant } from '../lib/format';
import { matchesQuery } from '../lib/search';
import { notificationLink, timeAgo } from '../lib/notifications';
import type { NotificationItem } from '../types';

const FILTERS = ['q', 'status'] as const;

/**
 * /notifications (S4): every role's full list, the latest 100, with search and a read/unread filter.
 * Opening one marks it read and goes to what it's about, as in the bell.
 */
export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch, isRefetching } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const filters = useUrlFilters(FILTERS);
  const { q, status } = filters.values;

  if (!user) return null;

  const items = data?.items ?? [];
  const rows = items.filter(
    (item) =>
      matchesQuery(q, item.message, item.reference) &&
      (!status || (status === 'unread') === !item.read),
  );

  const open = (item: NotificationItem) => {
    if (!item.read) markRead.mutate(item.id);
    navigate(notificationLink(item, user.role));
  };

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <Panel
        title="Notifications"
        actions={
          data &&
          data.unreadCount > 0 && (
            <Button
              variant="text"
              size="sm"
              onClick={() => markAllRead.mutate()}
              leftIcon={<CheckCheck size={16} aria-hidden="true" />}
            >
              Mark all as read ({data.unreadCount})
            </Button>
          )
        }
      >
        {items.length > 0 && (
          <FilterBar shown={rows.length} total={items.length} active={filters.active} onClear={filters.clear}>
            <SearchInput
              label="Search notifications"
              placeholder="Words or RQ number"
              value={q}
              onChange={(value) => filters.set('q', value)}
            />
            <FilterSelect
              label="Read or unread"
              allLabel="All"
              value={status}
              onChange={(value) => filters.set('status', value)}
              options={[
                { value: 'unread', label: 'Unread' },
                { value: 'read', label: 'Read' },
              ]}
            />
          </FilterBar>
        )}

        {isPending ? (
          <StateView state="loading" rows={5} />
        ) : isError ? (
          <StateView
            state="error"
            title="We couldn't load your notifications"
            error={error}
            action={
              <Button
                loading={isRefetching}
                onClick={() => void refetch()}
                leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}
              >
                Try again
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <StateView
            state="empty"
            icon={BellOff}
            title="No notifications yet"
            description="Requests, replies and decisions that concern you appear here."
          />
        ) : rows.length === 0 ? (
          <StateView
            state="no-results"
            title={status === 'unread' ? 'No unread notifications match' : 'No notifications match'}
            description="Try other words, or clear the filters to see them all."
            action={
              <Button variant="outline" onClick={filters.clear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-neutral-soft">
            {rows.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item)}
                  className={clsx(
                    'flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-bg focus-visible:bg-bg focus-visible:outline-none',
                    !item.read && 'bg-primary-soft/40',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={clsx('size-2 shrink-0 rounded-full', item.read ? 'bg-transparent' : 'bg-primary')}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={clsx('text-body', item.read ? 'text-text-muted' : 'font-medium text-ink')}>
                      {!item.read && <span className="sr-only">Unread: </span>}
                      {item.message}
                    </span>
                    <span className="text-caption text-text-subtle" title={formatInstant(item.createdAt, true)}>
                      {timeAgo(item.createdAt)}
                      {item.reference && ` · #${item.reference}`}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-text-subtle" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
