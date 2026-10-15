import { ClipboardList, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  BloodGroupBadge,
  Button,
  FilterBar,
  FilterSelect,
  Panel,
  RequestStatusBadge,
  SearchInput,
  StateView,
  Table,
  UrgencyTag,
  type Column,
} from '../../components/ui';
import { useAllRequests } from '../../hooks/useAdminRequests';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { formatBloodGroup, formatInstant } from '../../lib/format';
import { REQUEST_STATUS } from '../../lib/requestStatus';
import { matchesQuery } from '../../lib/search';
import { BLOOD_GROUPS, type RequestListItem, type RequestStatus, type Urgency } from '../../types';
import { RepliesSummary } from '../hospital/RepliesSummary';
import { AdminRequestPanel } from './AdminRequestPanel';

const FILTERS = ['q', 'hospital', 'city', 'status', 'urgency', 'group'] as const;
const URGENCIES: Urgency[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()))].sort((a, b) => a.localeCompare(b));
}

/**
 * /admin/requests (A7, A8): every hospital's requests, newest first, with search and filters; selecting one
 * opens a read-only panel with its replies and outcome. Filters and the open request live in the URL.
 */
export function AdminRequestsPage() {
  const { t } = useTranslation();
  const { data, isPending, isError, error, refetch, isRefetching } = useAllRequests();
  const filters = useUrlFilters(FILTERS);
  const { q, hospital, city, status, urgency, group } = filters.values;
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get('request')) || null;

  const select = (id: number | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (id === null) next.delete('request');
        else next.set('request', String(id));
        return next;
      },
      { replace: true },
    );

  const requests = data ?? [];
  const hospitals = uniqueSorted(requests.map((r) => r.hospitalName));
  const cities = uniqueSorted(requests.map((r) => r.city));
  const rows = requests.filter(
    (r) =>
      matchesQuery(q, r.reference, r.hospitalName, r.city, r.createdBy) &&
      (!hospital || r.hospitalName.trim() === hospital) &&
      (!city || r.city.trim().toLowerCase() === city.toLowerCase()) &&
      (!status || r.status === status) &&
      (!urgency || r.urgency === urgency) &&
      (!group || r.bloodGroup === group),
  );

  const columns: Column<RequestListItem>[] = [
    {
      key: 'request',
      header: t('common.request'),
      cell: (r) => (
        <div className="flex items-center gap-3">
          <BloodGroupBadge group={r.bloodGroup} />
          <div className="min-w-0">
            <p className="font-medium whitespace-nowrap">
              #{r.reference} · {t('common.unit', { count: r.unitsNeeded })}
            </p>
            <p className="truncate text-caption text-text-subtle">
              {r.hospitalName} · {r.city}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'urgency', header: t('common.urgency'), cell: (r) => <UrgencyTag urgency={r.urgency} /> },
    {
      key: 'posted',
      header: t('common.posted'),
      cell: (r) => <span className="whitespace-nowrap">{formatInstant(r.createdAt)}</span>,
    },
    { key: 'replies', header: t('common.replies'), cell: (r) => <RepliesSummary request={r} /> },
    { key: 'status', header: t('common.status'), cell: (r) => <RequestStatusBadge status={r.status} /> },
    {
      key: 'view',
      header: <span className="sr-only">{t('common.view')}</span>,
      align: 'right',
      cell: (r) => (
        <Button
          variant="text"
          size="sm"
          aria-label={t('admin.requests.viewLabel', { ref: r.reference })}
          onClick={() => select(r.id)}
        >
          {t('common.view')}
        </Button>
      ),
    },
  ];

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <Panel title={t('admin.requests.title')}>
        {requests.length > 0 && (
          <FilterBar shown={rows.length} total={requests.length} active={filters.active} onClear={filters.clear}>
            <SearchInput
              label={t('hospital.list.search')}
              placeholder={t('admin.requests.searchPlaceholder')}
              value={q}
              onChange={(value) => filters.set('q', value)}
            />
            <FilterSelect
              label={t('common.hospital')}
              allLabel={t('admin.requests.allHospitals')}
              value={hospital}
              onChange={(value) => filters.set('hospital', value)}
              options={hospitals.map((h) => ({ value: h, label: h }))}
            />
            <FilterSelect
              label={t('common.city')}
              allLabel={t('common.allCities')}
              value={city}
              onChange={(value) => filters.set('city', value)}
              options={cities.map((c) => ({ value: c, label: c }))}
            />
            <FilterSelect
              label={t('common.status')}
              allLabel={t('common.anyStatus')}
              value={status}
              onChange={(value) => filters.set('status', value)}
              options={(Object.keys(REQUEST_STATUS) as RequestStatus[]).map((s) => ({
                value: s,
                label: t(`status.request.${s}`),
              }))}
            />
            <FilterSelect
              label={t('common.urgency')}
              allLabel={t('common.anyUrgency')}
              value={urgency}
              onChange={(value) => filters.set('urgency', value)}
              options={URGENCIES.map((u) => ({ value: u, label: t(`status.urgency.${u}`) }))}
            />
            <FilterSelect
              label={t('common.bloodGroup')}
              allLabel={t('common.allGroups')}
              value={group}
              onChange={(value) => filters.set('group', value)}
              options={BLOOD_GROUPS.map((g) => ({ value: g, label: formatBloodGroup(g) }))}
            />
          </FilterBar>
        )}

        {isPending ? (
          <StateView state="loading" />
        ) : isError ? (
          <StateView
            state="error"
            title={t('admin.requests.loadError')}
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
        ) : requests.length === 0 ? (
          <StateView
            state="empty"
            icon={ClipboardList}
            title={t('hospital.list.emptyTitle')}
            description={t('admin.requests.emptyBody')}
          />
        ) : rows.length === 0 ? (
          <StateView
            state="no-results"
            title={t('hospital.list.noMatch')}
            description={t('hospital.list.noMatchBody')}
            action={
              <Button variant="outline" onClick={filters.clear}>
                {t('common.clearFilters')}
              </Button>
            }
          />
        ) : (
          <>
            <Table
              caption={t('admin.requests.caption')}
              rows={rows}
              rowKey={(r) => r.id}
              columns={columns}
              isSelected={(r) => r.id === selectedId}
            />
            {requests.length >= 500 && (
              <p className="border-t border-border px-5 py-3 text-caption text-text-subtle">
                {t('admin.requests.newest500')}
              </p>
            )}
          </>
        )}
      </Panel>

      <AdminRequestPanel requestId={selectedId} onClose={() => select(null)} />
    </div>
  );
}
