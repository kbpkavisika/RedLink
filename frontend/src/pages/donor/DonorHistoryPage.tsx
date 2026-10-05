import { CalendarCheck, Droplet, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, FilterBar, FilterSelect, LinkButton, Panel, SearchInput, StateView } from '../../components/ui';
import { useMyDonations } from '../../hooks/useDonorSelf';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { formatDate } from '../../lib/format';
import { matchesQuery } from '../../lib/search';
import type { DonationHistory, DonationItem } from '../../types';

const FILTERS = ['q', 'year'] as const;

/**
 * /donor/history (D10): "7 total · 7 lives helped", every donation newest first, and a dashed callout
 * with when the donor can give again (design.md §7). Search and a year filter, like every other list.
 */
export function DonorHistoryPage() {
  const history = useMyDonations();
  const filters = useUrlFilters(FILTERS);
  const { q, year } = filters.values;

  if (history.isPending) {
    return (
      <Panel>
        <StateView state="loading" rows={4} />
      </Panel>
    );
  }
  if (history.isError) {
    return (
      <Panel>
        <StateView
          state="error"
          title="We couldn't load your donation history"
          error={history.error}
          action={
            <Button
              loading={history.isRefetching}
              onClick={() => void history.refetch()}
              leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}
            >
              Try again
            </Button>
          }
        />
      </Panel>
    );
  }

  const data = history.data;
  const years = [...new Set(data.donations.map((donation) => donation.donationDate.slice(0, 4)))];
  const rows = data.donations.filter(
    (donation) =>
      (!year || donation.donationDate.startsWith(year)) &&
      matchesQuery(q, donation.hospitalName, donation.hospitalCity, donation.reference),
  );

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6">
      <Panel
        title="Your donations"
        actions={
          data.totalDonations > 0 && (
            <span className="text-label text-text-subtle">
              <strong className="text-ink">{data.totalDonations} total</strong> · {data.livesHelped}{' '}
              {data.livesHelped === 1 ? 'life' : 'lives'} helped
            </span>
          )
        }
      >
        {data.donations.length === 0 ? (
          <StateView
            state="empty"
            icon={Droplet}
            title="No donations yet"
            description="When you accept a request and give blood, the hospital records it here."
            action={<LinkButton to="/donor/requests">See requests that need you</LinkButton>}
          />
        ) : (
          <>
            <FilterBar shown={rows.length} total={data.donations.length} active={filters.active} onClear={filters.clear}>
              <SearchInput
                label="Search donations"
                placeholder="Hospital, city or RQ number"
                value={q}
                onChange={(value) => filters.set('q', value)}
              />
              {years.length > 1 && (
                <FilterSelect
                  label="Year"
                  allLabel="All years"
                  value={year}
                  onChange={(value) => filters.set('year', value)}
                  options={years.map((y) => ({ value: y, label: y }))}
                />
              )}
            </FilterBar>
            {rows.length === 0 ? (
              <StateView
                state="no-results"
                title="No donations match"
                description="Try another hospital or year, or clear the filters to see them all."
                action={
                  <Button variant="outline" onClick={filters.clear}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-neutral-soft">
                {rows.map((donation) => (
                  <DonationRow key={donation.id} donation={donation} />
                ))}
              </ul>
            )}
          </>
        )}
      </Panel>

      <NextDonationCallout history={data} />
    </div>
  );
}

// A list row (design.md §4.5): hospital, then date · request ID, units on the right
function DonationRow({ donation }: { donation: DonationItem }) {
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Droplet size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">
          {donation.hospitalName} <span className="font-normal text-text-subtle">· {donation.hospitalCity}</span>
        </p>
        <p className="text-caption text-text-subtle">
          {formatDate(donation.donationDate)}
          {donation.reference && ` · #${donation.reference}`}
        </p>
      </div>
      <span className="text-label font-semibold whitespace-nowrap text-ink">
        {donation.units} {donation.units === 1 ? 'unit' : 'units'}
      </span>
    </li>
  );
}

function NextDonationCallout({ history }: { history: DonationHistory }) {
  return (
    <p className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong px-4 py-3.5 text-label text-text-muted">
      <CalendarCheck size={20} className="shrink-0 text-text-subtle" aria-hidden="true" />
      {history.eligible ? (
        <span>
          <strong className="text-ink">You can donate now.</strong> Requests that need your blood group are on your{' '}
          <Link to="/donor/requests">requests page</Link>.
        </span>
      ) : (
        <span>
          You'll be eligible again on{' '}
          <strong className="text-ink">{formatDate(history.nextEligibleDate as string)}</strong>, 90 days after your
          last donation.
        </span>
      )}
    </p>
  );
}
