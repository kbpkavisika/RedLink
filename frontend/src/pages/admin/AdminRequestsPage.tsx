import { ClipboardList, RefreshCw } from 'lucide-react';
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
import { BLOOD_GROUPS, type RequestListItem, type RequestStatus } from '../../types';
import { RepliesSummary } from '../hospital/RepliesSummary';
import { AdminRequestPanel } from './AdminRequestPanel';

const FILTERS = ['q', 'hospital', 'city', 'status', 'urgency', 'group'] as const;
const URGENCIES = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()))].sort((a, b) => a.localeCompare(b));
}

/**
 * /admin/requests (A7, A8): every hospital's requests, newest first, with search and filters; selecting one
 * opens a read-only panel with its replies and outcome. Filters and the open request live in the URL.
 */
export function AdminRequestsPage() {
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
      header: 'Request',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <BloodGroupBadge group={r.bloodGroup} />
          <div className="min-w-0">
            <p className="font-medium whitespace-nowrap">
              #{r.reference} · {r.unitsNeeded} {r.unitsNeeded === 1 ? 'unit' : 'units'}
            </p>
            <p className="truncate text-caption text-text-subtle">
              {r.hospitalName} · {r.city}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'urgency', header: 'Urgency', cell: (r) => <UrgencyTag urgency={r.urgency} /> },
    {
      key: 'posted',
      header: 'Posted',
      cell: (r) => <span className="whitespace-nowrap">{formatInstant(r.createdAt)}</span>,
    },
    { key: 'replies', header: 'Replies', cell: (r) => <RepliesSummary request={r} /> },
    { key: 'status', header: 'Status', cell: (r) => <RequestStatusBadge status={r.status} /> },
    {
      key: 'view',
      header: <span className="sr-only">View</span>,
      align: 'right',
      cell: (r) => (
        <Button variant="text" size="sm" aria-label={`View #${r.reference}`} onClick={() => select(r.id)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <Panel title="All requests">
        {requests.length > 0 && (
          <FilterBar shown={rows.length} total={requests.length} active={filters.active} onClear={filters.clear}>
            <SearchInput
              label="Search requests"
              placeholder="RQ number, hospital or city"
              value={q}
              onChange={(value) => filters.set('q', value)}
            />
            <FilterSelect
              label="Hospital"
              allLabel="All hospitals"
              value={hospital}
              onChange={(value) => filters.set('hospital', value)}
              options={hospitals.map((h) => ({ value: h, label: h }))}
            />
            <FilterSelect
              label="City"
              allLabel="All cities"
              value={city}
              onChange={(value) => filters.set('city', value)}
              options={cities.map((c) => ({ value: c, label: c }))}
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
            title="We couldn't load requests"
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
            description="Requests appear here as soon as approved hospitals post them."
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
          <>
            <Table
              caption="Requests across every hospital, newest first"
              rows={rows}
              rowKey={(r) => r.id}
              columns={columns}
              isSelected={(r) => r.id === selectedId}
            />
            {requests.length >= 500 && (
              <p className="border-t border-border px-5 py-3 text-caption text-text-subtle">
                Showing the newest 500 requests.
              </p>
            )}
          </>
        )}
      </Panel>

      <AdminRequestPanel requestId={selectedId} onClose={() => select(null)} />
    </div>
  );
}
