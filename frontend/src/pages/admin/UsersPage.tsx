import { RefreshCw, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import {
  Badge,
  Button,
  FilterBar,
  FilterSelect,
  Panel,
  SearchInput,
  SegmentedControl,
  StateView,
  Table,
  type BadgeTone,
  type Column,
  type SegmentOption,
} from '../../components/ui';
import { useUserSearch } from '../../hooks/useAdminUsers';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { formatInstant } from '../../lib/format';
import type { Role, UserSummary } from '../../types';
import { AddStaffPanel } from './AddStaffPanel';

type RoleTab = Role | 'ALL';
const ROLE_TABS: RoleTab[] = ['ALL', 'ADMIN', 'HOSPITAL_STAFF', 'DONOR'];

// The API returns at most this many (backend: UserAdminService.MAX_RESULTS)
const MAX_RESULTS = 200;

const FILTERS = ['q', 'role', 'status'] as const;

// The words are translated: t(`admin.users.userStatus.${status}`)
type UserStatus = 'active' | 'temporary' | 'disabled';
const STATUS_TONES: Record<UserStatus, BadgeTone> = {
  active: 'success',
  temporary: 'warning',
  disabled: 'neutral',
};

function statusOf(user: UserSummary): UserStatus {
  return !user.enabled ? 'disabled' : user.mustChangePassword ? 'temporary' : 'active';
}

function parseRole(value: string | null): RoleTab {
  return ROLE_TABS.find((tab) => tab === value) ?? 'ALL';
}

/**
 * /admin/users (A5): search everyone by name or email, filter by role, and add staff to a hospital.
 * Admins can't see or change anyone's password: only the account's owner can.
 * The role filter and search text live in the URL (?role=DONOR&q=kamal).
 */
export function UsersPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const filters = useUrlFilters(FILTERS);
  const role = parseRole(filters.values.role);
  const { q, status } = filters.values;
  const [adding, setAdding] = useState(false);

  // Name/email search and role run on the server (the list is capped at the newest 200); status filters what came back
  const { data: users, isPending, isError, error, refetch, isRefetching, isFetching } = useUserSearch({
    role: role === 'ALL' ? undefined : role,
    q: q || undefined,
  });
  const rows = (users ?? []).filter((user) => !status || statusOf(user) === status);

  const roleOptions: SegmentOption<RoleTab>[] = ROLE_TABS.map((tab) => ({
    value: tab,
    label: tab === 'ALL' ? t('common.all') : t(`admin.users.roleTab.${tab}`),
  }));

  const columns: Column<UserSummary>[] = [
    {
      key: 'user',
      header: t('admin.users.user'),
      cell: (user) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {user.fullName}
            {user.id === me?.id && <span className="text-text-subtle">{t('admin.users.you')}</span>}
          </p>
          <p className="truncate text-caption text-text-subtle">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('admin.users.role'),
      cell: (user) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap">{t(`status.role.${user.role}`)}</p>
          {user.hospitalName && <p className="truncate text-caption text-text-subtle">{user.hospitalName}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (user) => {
        const userStatus = statusOf(user);
        return <Badge tone={STATUS_TONES[userStatus]}>{t(`admin.users.userStatus.${userStatus}`)}</Badge>;
      },
    },
    {
      key: 'joined',
      header: t('admin.users.joined'),
      cell: (user) => <span className="whitespace-nowrap">{formatInstant(user.createdAt)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SegmentedControl
          label={t('admin.users.filterLabel')}
          options={roleOptions}
          value={role}
          onChange={(value) => filters.set('role', value === 'ALL' ? null : value)}
        />
        <Button leftIcon={<UserPlus size={16} aria-hidden="true" />} onClick={() => setAdding(true)}>
          {t('admin.users.addStaff')}
        </Button>
      </div>

      <div className={adding ? 'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]' : undefined}>
        <Panel
          title={t('admin.users.title')}
          actions={
            users && (
              <span className="text-label text-text-subtle" aria-live="polite">
                {isFetching
                  ? t('common.searching')
                  : users.length >= MAX_RESULTS
                    ? t('admin.users.newest', { count: MAX_RESULTS })
                    : t('admin.users.found', { count: rows.length })}
              </span>
            )
          }
        >
          <FilterBar active={filters.active} onClear={filters.clear}>
            <SearchInput
              label={t('admin.users.search')}
              placeholder={t('admin.users.searchPlaceholder')}
              value={q}
              onChange={(value) => filters.set('q', value)}
            />
            <FilterSelect
              label={t('common.status')}
              allLabel={t('common.anyStatus')}
              value={status}
              onChange={(value) => filters.set('status', value)}
              options={(Object.keys(STATUS_TONES) as UserStatus[]).map((key) => ({
                value: key,
                label: t(`admin.users.userStatus.${key}`),
              }))}
            />
          </FilterBar>
          {isPending ? (
            <StateView state="loading" />
          ) : isError ? (
            <StateView
              state="error"
              title={t('admin.users.loadError')}
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
          ) : rows.length === 0 ? (
            filters.active ? (
              <StateView
                state="no-results"
                title={t('admin.users.noMatch')}
                description={t('admin.users.noMatchBody')}
                secondaryAction={
                  <Button variant="outline" onClick={filters.clear}>
                    {t('common.clearFilters')}
                  </Button>
                }
              />
            ) : (
              <StateView state="empty" icon={Users} title={t('admin.users.empty')} />
            )
          ) : (
            <>
              <Table caption={t('admin.users.title')} rows={rows} rowKey={(user) => user.id} columns={columns} />
              {users.length >= MAX_RESULTS && (
                <p className="border-t border-border px-5 py-3 text-caption text-text-subtle">
                  {t('admin.users.showingNewest', { count: MAX_RESULTS })}
                </p>
              )}
            </>
          )}
        </Panel>

        {adding && <AddStaffPanel onClose={() => setAdding(false)} />}
      </div>
    </div>
  );
}
