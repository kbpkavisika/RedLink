import { RefreshCw, Users } from 'lucide-react';
import {
  Badge,
  BloodGroupBadge,
  Button,
  FilterBar,
  FilterSelect,
  Panel,
  SearchInput,
  StateView,
  Table,
  type Column,
} from '../../components/ui';
import { useDonors } from '../../hooks/useDonors';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { formatBloodGroup, formatDate } from '../../lib/format';
import { matchesQuery } from '../../lib/search';
import { BLOOD_GROUPS, type DonorSummary } from '../../types';

// Same rule as the backend's DonorEligibility: never donated, or at least 90 days ago
const DAYS_BETWEEN_DONATIONS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  const today = new Date();
  return Math.floor(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(year, month - 1, day)) / DAY_MS,
  );
}

function canDonate(donor: DonorSummary): boolean {
  return donor.lastDonationDate === null || daysSince(donor.lastDonationDate) >= DAYS_BETWEEN_DONATIONS;
}

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
      donor.lastDonationDate ? (
        <div>
          <p className="whitespace-nowrap">{formatDate(donor.lastDonationDate)}</p>
          {!canDonate(donor) && <p className="text-caption text-warning">Waiting 90 days</p>}
        </div>
      ) : (
        <span className="text-text-subtle">Never</span>
      ),
  },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    cell: (donor) => (donor.available ? <Badge tone="success">Available</Badge> : <Badge>Paused</Badge>),
  },
];

const FILTERS = ['q', 'group', 'city', 'status', 'eligibility'] as const;

/**
 * /admin/donors: every donor, with search (name, phone, city) and filters (group, city, availability,
 * eligibility). The list is loaded once and filtered in the browser; the filters live in the URL.
 * Reference page for data views: one query, one Panel, a FilterBar, and a StateView for every other state.
 */
export function DonorsPage() {
  const { data: donors, isPending, isError, error, refetch, isRefetching } = useDonors();
  const filters = useUrlFilters(FILTERS);
  const { q, group, city, status, eligibility } = filters.values;

  const cities = [...new Set((donors ?? []).map((donor) => donor.city.trim()))].sort((a, b) => a.localeCompare(b));

  const rows = (donors ?? []).filter(
    (donor) =>
      matchesQuery(q, donor.name, donor.phone, donor.city) &&
      (!group || donor.bloodGroup === group) &&
      (!city || donor.city.trim().toLowerCase() === city.toLowerCase()) &&
      (!status || (status === 'available') === donor.available) &&
      (!eligibility || (eligibility === 'now') === canDonate(donor)),
  );

  const describe = [
    group && `${formatBloodGroup(group as DonorSummary['bloodGroup'])} donors`,
    city && `in ${city}`,
    q && `matching "${q}"`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Panel title="Donors">
      {donors && donors.length > 0 && (
        <FilterBar shown={rows.length} total={donors.length} active={filters.active} onClear={filters.clear}>
          <SearchInput
            label="Search donors"
            placeholder="Name, phone or city"
            value={q}
            onChange={(value) => filters.set('q', value)}
          />
          <FilterSelect
            label="Blood group"
            allLabel="All groups"
            value={group}
            onChange={(value) => filters.set('group', value)}
            options={BLOOD_GROUPS.map((g) => ({ value: g, label: formatBloodGroup(g) }))}
          />
          <FilterSelect
            label="City"
            allLabel="All cities"
            value={city}
            onChange={(value) => filters.set('city', value)}
            options={cities.map((c) => ({ value: c, label: c }))}
          />
          <FilterSelect
            label="Availability"
            allLabel="Any availability"
            value={status}
            onChange={(value) => filters.set('status', value)}
            options={[
              { value: 'available', label: 'Available' },
              { value: 'paused', label: 'Paused' },
            ]}
          />
          <FilterSelect
            label="Eligibility"
            allLabel="Any eligibility"
            value={eligibility}
            onChange={(value) => filters.set('eligibility', value)}
            options={[
              { value: 'now', label: 'Can donate now' },
              { value: 'waiting', label: 'Waiting 90 days' },
            ]}
          />
        </FilterBar>
      )}

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
      ) : rows.length === 0 ? (
        <StateView
          state="no-results"
          title={describe ? `No ${describe}` : 'No donors match these filters'}
          description="Try another search, or clear the filters to see every donor."
          action={
            <Button variant="outline" onClick={filters.clear}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <Table caption="Registered donors" rows={rows} rowKey={(donor) => donor.id} columns={columns} />
      )}
    </Panel>
  );
}
