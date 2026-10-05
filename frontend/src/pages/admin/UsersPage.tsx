import { RefreshCw, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
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
import { roleLabel } from '../../lib/roles';
import type { Role, UserSummary } from '../../types';
import { AddStaffPanel } from './AddStaffPanel';
import { TemporaryPasswordPanel } from './TemporaryPasswordPanel';

type RoleTab = Role | 'ALL';
const ROLE_OPTIONS: SegmentOption<RoleTab>[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'HOSPITAL_STAFF', label: 'Hospital staff' },
  { value: 'DONOR', label: 'Donors' },
];

// The API returns at most this many (backend: UserAdminService.MAX_RESULTS)
const MAX_RESULTS = 200;

type SidePanel = { kind: 'add' } | { kind: 'password'; user: UserSummary } | null;

const FILTERS = ['q', 'role', 'status'] as const;

type UserStatus = 'active' | 'temporary' | 'disabled';
const STATUS: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  temporary: { label: 'Temporary password', tone: 'warning' },
  disabled: { label: 'Disabled', tone: 'neutral' },
};

function statusOf(user: UserSummary): UserStatus {
  return !user.enabled ? 'disabled' : user.mustChangePassword ? 'temporary' : 'active';
}

function parseRole(value: string | null): RoleTab {
  return ROLE_OPTIONS.find((option) => option.value === value)?.value ?? 'ALL';
}

/**
 * /admin/users (A5): search everyone by name or email, filter by role, add staff to a hospital,
 * and set a temporary password for someone who has forgotten theirs.
 * The role filter and search text live in the URL (?role=DONOR&q=kamal).
 */
export function UsersPage() {
  const { user: me } = useAuth();
  const filters = useUrlFilters(FILTERS);
  const role = parseRole(filters.values.role);
  const { q, status } = filters.values;
  const [panel, setPanel] = useState<SidePanel>(null);

  // Name/email search and role run on the server (the list is capped at the newest 200); status filters what came back
  const { data: users, isPending, isError, error, refetch, isRefetching, isFetching } = useUserSearch({
    role: role === 'ALL' ? undefined : role,
    q: q || undefined,
  });
  const rows = (users ?? []).filter((user) => !status || statusOf(user) === status);

  const columns: Column<UserSummary>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (user) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {user.fullName}
            {user.id === me?.id && <span className="text-text-subtle"> (you)</span>}
          </p>
          <p className="truncate text-caption text-text-subtle">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (user) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap">{roleLabel(user.role)}</p>
          {user.hospitalName && <p className="truncate text-caption text-text-subtle">{user.hospitalName}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (user) => {
        const { label, tone } = STATUS[statusOf(user)];
        return <Badge tone={tone}>{label}</Badge>;
      },
    },
    {
      key: 'joined',
      header: 'Joined',
      cell: (user) => <span className="whitespace-nowrap">{formatInstant(user.createdAt)}</span>,
    },
    {
      key: 'action',
      header: <span className="sr-only">Action</span>,
      align: 'right',
      // Admins change their own password on /change-password instead
      cell: (user) =>
        user.id !== me?.id && (
          <Button
            variant="text"
            size="sm"
            aria-label={`Set a temporary password for ${user.fullName}`}
            onClick={() => setPanel({ kind: 'password', user })}
          >
            Reset password
          </Button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SegmentedControl
          label="Filter users by role"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(value) => filters.set('role', value === 'ALL' ? null : value)}
        />
        <Button leftIcon={<UserPlus size={16} aria-hidden="true" />} onClick={() => setPanel({ kind: 'add' })}>
          Add staff user
        </Button>
      </div>

      <div className={panel ? 'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]' : undefined}>
        <Panel
          title="Users"
          actions={
            users && (
              <span className="text-label text-text-subtle" aria-live="polite">
                {isFetching ? 'Searching…' : users.length >= MAX_RESULTS ? `Newest ${MAX_RESULTS}` : `${rows.length} found`}
              </span>
            )
          }
        >
          <FilterBar active={filters.active} onClear={filters.clear}>
            <SearchInput
              label="Search users"
              placeholder="Name or email"
              value={q}
              onChange={(value) => filters.set('q', value)}
            />
            <FilterSelect
              label="Status"
              allLabel="Any status"
              value={status}
              onChange={(value) => filters.set('status', value)}
              options={(Object.keys(STATUS) as UserStatus[]).map((key) => ({ value: key, label: STATUS[key].label }))}
            />
          </FilterBar>
          {isPending ? (
            <StateView state="loading" />
          ) : isError ? (
            <StateView
              state="error"
              title="We couldn't load users"
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
          ) : rows.length === 0 ? (
            filters.active ? (
              <StateView
                state="no-results"
                title="No users match"
                description="Check the spelling, or search for part of the name or email."
                secondaryAction={
                  <Button variant="outline" onClick={filters.clear}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <StateView state="empty" icon={Users} title="No users yet" />
            )
          ) : (
            <>
              <Table
                caption="Users"
                rows={rows}
                rowKey={(user) => user.id}
                columns={columns}
                isSelected={(user) => panel?.kind === 'password' && panel.user.id === user.id}
              />
              {users.length >= MAX_RESULTS && (
                <p className="border-t border-border px-5 py-3 text-caption text-text-subtle">
                  Showing the newest {MAX_RESULTS}. Search by name or email to find someone older.
                </p>
              )}
            </>
          )}
        </Panel>

        {panel?.kind === 'add' && <AddStaffPanel onClose={() => setPanel(null)} />}
        {panel?.kind === 'password' && (
          // Keyed by user so switching users starts a fresh form with a new password
          <TemporaryPasswordPanel key={panel.user.id} user={panel.user} onClose={() => setPanel(null)} />
        )}
      </div>
    </div>
  );
}
