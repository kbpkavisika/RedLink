import clsx from 'clsx';
import { BellOff, CheckCheck, ChevronRight, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button, FilterBar, FilterSelect, Panel, SearchInput, StateView } from '../components/ui';
import { useMarkAllRead, useMarkRead, useNotifications } from '../hooks/useNotifications';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { currentLanguage } from '../i18n';
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
  const { t } = useTranslation();
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
        title={t('notifications.title')}
        actions={
          data &&
          data.unreadCount > 0 && (
            <Button
              variant="text"
              size="sm"
              onClick={() => markAllRead.mutate()}
              leftIcon={<CheckCheck size={16} aria-hidden="true" />}
            >
              {t('notifications.markAllReadCount', { count: data.unreadCount })}
            </Button>
          )
        }
      >
        {items.length > 0 && (
          <FilterBar shown={rows.length} total={items.length} active={filters.active} onClear={filters.clear}>
            <SearchInput
              label={t('notifications.search')}
              placeholder={t('notifications.searchPlaceholder')}
              value={q}
              onChange={(value) => filters.set('q', value)}
            />
            <FilterSelect
              label={t('notifications.readFilter')}
              allLabel={t('common.all')}
              value={status}
              onChange={(value) => filters.set('status', value)}
              options={[
                { value: 'unread', label: t('notifications.unread') },
                { value: 'read', label: t('notifications.read') },
              ]}
            />
          </FilterBar>
        )}

        {isPending ? (
          <StateView state="loading" rows={5} />
        ) : isError ? (
          <StateView
            state="error"
            title={t('notifications.loadError')}
            error={error}
            action={
              <Button
                loading={isRefetching}
                onClick={() => void refetch()}
                leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}
              >
                {t('common.tryAgain')}
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <StateView
            state="empty"
            icon={BellOff}
            title={t('notifications.emptyTitle')}
            description={t('notifications.emptyBody')}
          />
        ) : rows.length === 0 ? (
          <StateView
            state="no-results"
            title={status === 'unread' ? t('notifications.noUnreadMatch') : t('notifications.noneMatch')}
            description={t('notifications.noMatchBody')}
            action={
              <Button variant="outline" onClick={filters.clear}>
                {t('common.clearFilters')}
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
                      {!item.read && <span className="sr-only">{t('notifications.unreadPrefix')}</span>}
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
      {/* The server writes notifications in English for now (README "Languages") */}
      {currentLanguage() !== 'en' && items.length > 0 && (
        <p className="mt-3 text-center text-caption text-text-subtle">{t('notifications.serverTextNote')}</p>
      )}
    </div>
  );
}
