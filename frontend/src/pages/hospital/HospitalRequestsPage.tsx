import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  BloodGroupBadge,
  Button,
  FilterBar,
  FilterSelect,
  LinkButton,
  Panel,
  RequestStatusBadge,
  SearchInput,
  StateView,
  Table,
  UrgencyTag,
  type Column,
} from '../../components/ui';
import { useHospitalRequests } from '../../hooks/useRequests';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { formatBloodGroup, formatInstant } from '../../lib/format';
import { REQUEST_STATUS } from '../../lib/requestStatus';
import { RepliesSummary } from './RepliesSummary';
import { matchesQuery } from '../../lib/search';
import { BLOOD_GROUPS, type RequestListItem, type RequestStatus, type Urgency } from '../../types';

const FILTERS = ['q', 'status', 'urgency', 'group'] as const;
const URGENCIES: Urgency[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * /hospital/requests (H11): every request the hospital has posted, newest first, with search and filters.
 * Clicking "Open" goes to the request page.
 */
export function HospitalRequestsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch, isRefetching } = useHospitalRequests();
  const filters = useUrlFilters(FILTERS);
  const { q, status, urgency, group } = filters.values;

  const requests = data?.requests ?? [];
  const rows = requests.filter(
    (request) =>
      matchesQuery(q, request.reference, request.city, request.createdBy, formatBloodGroup(request.bloodGroup)) &&
      (!status || request.status === status) &&
      (!urgency || request.urgency === urgency) &&
      (!group || request.bloodGroup === group),
  );

  const columns: Column<RequestListItem>[] = [
    {
      key: 'request',
      header: t('common.request'),
      cell: (request) => (
        <div className="flex items-center gap-3">
          <BloodGroupBadge group={request.bloodGroup} />
          <div className="min-w-0">
            <p className="font-medium whitespace-nowrap">
              #{request.reference} · {t('common.unit', { count: request.unitsNeeded })}
            </p>
            <p className="truncate text-caption text-text-subtle">
              {t('hospital.list.byStaff', { city: request.city, name: request.createdBy })}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'urgency', header: t('common.urgency'), cell: (request) => <UrgencyTag urgency={request.urgency} /> },
    {
      key: 'neededBy',
      header: t('common.neededBy'),
      cell: (request) => <span className="whitespace-nowrap">{formatInstant(request.neededBy, true)}</span>,
    },
    { key: 'replies', header: t('common.replies'), cell: (request) => <RepliesSummary request={request} /> },
    {
      key: 'status',
      header: t('common.status'),
      align: 'right',
      cell: (request) => <RequestStatusBadge status={request.status} />,
    },
    {
      key: 'open',
      header: <span className="sr-only">{t('hospital.list.open')}</span>,
      align: 'right',
      cell: (request) => (
        <Button
          variant="text"
          size="sm"
          aria-label={t('hospital.list.openLabel', { ref: request.reference })}
          onClick={() => navigate(`/hospital/requests/${request.id}`)}
        >
          {t('hospital.list.open')}
        </Button>
      ),
    },
  ];

  return (
    <Panel
      title={t('hospital.list.title')}
      actions={
        <LinkButton to="/hospital/requests/new" size="sm" leftIcon={<Plus size={16} aria-hidden="true" />}>
          {t('hospital.list.newRequest')}
        </LinkButton>
      }
    >
      {requests.length > 0 && (
        <FilterBar shown={rows.length} total={requests.length} active={filters.active} onClear={filters.clear}>
          <SearchInput
            label={t('hospital.list.search')}
            placeholder={t('hospital.list.searchPlaceholder')}
            value={q}
            onChange={(value) => filters.set('q', value)}
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
          title={t('hospital.list.loadError')}
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
          description={t('hospital.list.emptyBody')}
          action={<LinkButton to="/hospital/requests/new">{t('hospital.list.createFirst')}</LinkButton>}
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
        <Table caption={t('hospital.list.caption')} rows={rows} rowKey={(r) => r.id} columns={columns} />
      )}
    </Panel>
  );
}
