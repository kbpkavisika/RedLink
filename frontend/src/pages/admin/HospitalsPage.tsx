import { Building2, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  HospitalStatusBadge,
  Panel,
  SegmentedControl,
  StateView,
  Table,
  type Column,
  type SegmentOption,
} from '../../components/ui';
import { useHospitals } from '../../hooks/useAdminHospitals';
import { formatInstant } from '../../lib/format';
import type { HospitalStatus, HospitalSummary } from '../../types';
import { HospitalReviewPanel } from './HospitalReviewPanel';

type Tab = HospitalStatus | 'ALL';
const TABS: Tab[] = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];
const TAB_LABELS: Record<Tab, string> = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', ALL: 'All' };

const EMPTY: Record<Tab, { title: string; description: string }> = {
  PENDING: { title: 'No hospitals waiting', description: 'New hospital registrations appear here for you to review.' },
  APPROVED: { title: 'No approved hospitals yet', description: 'Hospitals you approve appear here.' },
  REJECTED: { title: 'No rejected hospitals', description: 'Hospitals you reject appear here, with your reason.' },
  ALL: { title: 'No hospitals yet', description: 'Hospitals appear here as soon as they register.' },
};

function parseTab(value: string | null): Tab {
  return TABS.find((tab) => tab === value) ?? 'PENDING';
}

/**
 * /admin/hospitals: the approval queue (A1) and the review panel (A2–A4).
 * The tab and the open hospital live in the URL (?status=PENDING&hospital=12), so reloading or sharing keeps them.
 */
export function HospitalsPage() {
  const { data: hospitals, isPending, isError, error, refetch, isRefetching } = useHospitals();
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get('status'));
  const selectedId = Number(params.get('hospital')) || null;

  const update = (changes: Record<string, string | null>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([key, value]) => (value === null ? next.delete(key) : next.set(key, value)));
        return next;
      },
      { replace: true },
    );
  };

  const counts = Object.fromEntries(
    TABS.map((t) => [t, hospitals?.filter((h) => t === 'ALL' || h.status === t).length]),
  ) as Record<Tab, number | undefined>;

  const options: SegmentOption<Tab>[] = TABS.map((t) => ({ value: t, label: TAB_LABELS[t], count: counts[t] }));

  // The queue is oldest first, so nobody waits longest; other tabs show the newest first (as the API sends them)
  const rows = (hospitals ?? []).filter((h) => tab === 'ALL' || h.status === tab);
  if (tab === 'PENDING') rows.reverse();

  const columns: Column<HospitalSummary>[] = [
    {
      key: 'hospital',
      header: 'Hospital',
      cell: (hospital) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{hospital.name}</p>
          <p className="font-mono text-caption text-text-subtle">{hospital.registrationNo}</p>
        </div>
      ),
    },
    { key: 'city', header: 'City', cell: (hospital) => hospital.city },
    {
      key: 'registered',
      header: 'Registered',
      cell: (hospital) => <span className="whitespace-nowrap">{formatInstant(hospital.createdAt)}</span>,
    },
    { key: 'status', header: 'Status', cell: (hospital) => <HospitalStatusBadge status={hospital.status} /> },
    {
      key: 'action',
      header: <span className="sr-only">Action</span>,
      align: 'right',
      cell: (hospital) => (
        <Button
          variant={hospital.status === 'PENDING' ? 'outline' : 'text'}
          size="sm"
          aria-label={`${hospital.status === 'PENDING' ? 'Review' : 'View'} ${hospital.name}`}
          onClick={() => update({ hospital: String(hospital.id) })}
        >
          {hospital.status === 'PENDING' ? 'Review' : 'View'}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl
        label="Filter hospitals by status"
        options={options}
        value={tab}
        onChange={(value) => update({ status: value })}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Panel title={tab === 'PENDING' ? 'Waiting for review' : `${TAB_LABELS[tab]} hospitals`}>
          {isPending ? (
            <StateView state="loading" />
          ) : isError ? (
            <StateView
              state="error"
              title="We couldn't load hospitals"
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
            <StateView state="empty" icon={Building2} {...EMPTY[tab]} />
          ) : (
            <Table
              caption={`${TAB_LABELS[tab]} hospitals`}
              rows={rows}
              rowKey={(hospital) => hospital.id}
              columns={columns}
              isSelected={(hospital) => hospital.id === selectedId}
            />
          )}
        </Panel>

        <HospitalReviewPanel hospitalId={selectedId} onClose={() => update({ hospital: null })} />
      </div>
    </div>
  );
}
