import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
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
const URGENCIES: { value: Urgency; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const columns: Column<RequestListItem>[] = [
  {
    key: 'request',
    header: 'Request',
    cell: (request) => (
      <div className="flex items-center gap-3">
        <BloodGroupBadge group={request.bloodGroup} />
        <div className="min-w-0">
          <p className="font-medium whitespace-nowrap">
            #{request.reference} · {request.unitsNeeded} {request.unitsNeeded === 1 ? 'unit' : 'units'}
          </p>
          <p className="truncate text-caption text-text-subtle">
            {request.city} · by {request.createdBy}
          </p>
        </div>
      </div>
    ),
  },
  { key: 'urgency', header: 'Urgency', cell: (request) => <UrgencyTag urgency={request.urgency} /> },
  {
    key: 'neededBy',
    header: 'Needed by',
    cell: (request) => <span className="whitespace-nowrap">{formatInstant(request.neededBy, true)}</span>,
  },
  { key: 'replies', header: 'Replies', cell: (request) => <RepliesSummary request={request} /> },
  { key: 'status', header: 'Status', align: 'right', cell: (request) => <RequestStatusBadge status={request.status} /> },
];

/**
 * /hospital/requests (H11): every request the hospital has posted, newest first, with search and filters.
 * Clicking "Open" goes to the request page.
 */
export function HospitalRequestsPage() {
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

  const rowColumns: Column<RequestListItem>[] = [
    ...columns,
    {
      key: 'open',
      header: <span className="sr-only">Open</span>,
      align: 'right',
      cell: (request) => (
        <Button
          variant="text"
          size="sm"
          aria-label={`Open #${request.reference}`}
          onClick={() => navigate(`/hospital/requests/${request.id}`)}
        >
          Open
        </Button>
      ),
    },
  ];

  return (
    <Panel
      title="All requests"
      actions={
        <LinkButton to="/hospital/requests/new" size="sm" leftIcon={<Plus size={16} aria-hidden="true" />}>
          New request
        </LinkButton>
      }
    >
      {requests.length > 0 && (
        <FilterBar shown={rows.length} total={requests.length} active={filters.active} onClear={filters.clear}>
          <SearchInput
            label="Search requests"
            placeholder="RQ number, city or staff"
            value={q}
            onChange={(value) => filters.set('q', value)}
          />
          <FilterSelect
            label="Status"
            allLabel="Any status"
            value={status}
            onChange={(value) => filters.set('status', value)}
            options={(Object.keys(REQUEST_STATUS) as RequestStatus[]).map((s) => ({
              value: s,
              label: REQUEST_STATUS[s].label,
            }))}
          />
          <FilterSelect
            label="Urgency"
            allLabel="Any urgency"
            value={urgency}
            onChange={(value) => filters.set('urgency', value)}
            options={URGENCIES}
          />
          <FilterSelect
            label="Blood group"
            allLabel="All groups"
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
          title="We couldn't load your requests"
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
      ) : requests.length === 0 ? (
        <StateView
          state="empty"
          icon={ClipboardList}
          title="No requests yet"
          description="Post a request and RedLink ranks every compatible, eligible donor and notifies the best matches."
          action={<LinkButton to="/hospital/requests/new">Create your first request</LinkButton>}
        />
      ) : rows.length === 0 ? (
        <StateView
          state="no-results"
          title="No requests match"
          description="Try another search, or clear the filters to see every request."
          action={
            <Button variant="outline" onClick={filters.clear}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <Table caption="Your hospital's requests, newest first" rows={rows} rowKey={(r) => r.id} columns={rowColumns} />
      )}
    </Panel>
  );
}
