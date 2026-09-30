import { RefreshCw, Users } from 'lucide-react';
import { Badge, BloodGroupBadge, Button, Panel, StateView, Table, type Column } from '../../components/ui';
import { useDonors } from '../../hooks/useDonors';
import { formatDate } from '../../lib/format';
import type { DonorSummary } from '../../types';

const columns: Column<DonorSummary>[] = [
  {
    key: 'donor',
    header: 'Donor',
    cell: (donor) => (
      <div className="flex items-center gap-3">
        <BloodGroupBadge group={donor.bloodGroup} />
        <div className="min-w-0">
          <p className="truncate font-medium">{donor.name}</p>
          <p className="text-caption text-text-subtle">{donor.city}</p>
        </div>
      </div>
    ),
  },
  { key: 'phone', header: 'Phone', cell: (donor) => donor.phone },
  {
    key: 'lastDonation',
    header: 'Last donation',
    cell: (donor) =>
      donor.lastDonationDate ? formatDate(donor.lastDonationDate) : <span className="text-text-subtle">Never</span>,
  },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    cell: (donor) => (donor.available ? <Badge tone="success">Available</Badge> : <Badge>Unavailable</Badge>),
  },
];

/**
 * Reference page for data views: one query, one Panel, and a StateView for every state that isn't the data.
 * Copy this shape for new list pages.
 */
export function DonorsPage() {
  const { data: donors, isPending, isError, error, refetch, isRefetching } = useDonors();

  return (
    <Panel
      title="Donors"
      actions={donors && donors.length > 0 && <span className="text-label text-text-subtle">{donors.length} total</span>}
    >
      {isPending ? (
        <StateView state="loading" />
      ) : isError ? (
        <StateView
          state="error"
          title="We couldn't load donors"
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
      ) : donors.length === 0 ? (
        <StateView
          state="empty"
          icon={Users}
          title="No donors yet"
          description="Donors appear here as soon as they register, ready to be matched to hospital requests."
        />
      ) : (
        <Table caption="Registered donors" rows={donors} rowKey={(donor) => donor.id} columns={columns} />
      )}
    </Panel>
  );
}
