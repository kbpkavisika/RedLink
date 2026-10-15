import { CalendarCheck, Droplet, RefreshCw } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
          title={t('donor.history.loadError')}
          error={history.error}
          action={
            <Button
              loading={history.isRefetching}
              onClick={() => void history.refetch()}
              leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}
            >
              {t('common.tryAgain')}
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
        title={t('donor.history.title')}
        actions={
          data.totalDonations > 0 && (
            <span className="text-label text-text-subtle">
              <Trans
                i18nKey="donor.history.summary"
                values={{ total: data.totalDonations }}
                count={data.livesHelped}
                components={{ b: <strong className="text-ink" /> }}
              />
            </span>
          )
        }
      >
        {data.donations.length === 0 ? (
          <StateView
            state="empty"
            icon={Droplet}
            title={t('donor.history.emptyTitle')}
            description={t('donor.history.emptyBody')}
            action={<LinkButton to="/donor/requests">{t('donor.history.seeRequests')}</LinkButton>}
          />
        ) : (
          <>
            <FilterBar shown={rows.length} total={data.donations.length} active={filters.active} onClear={filters.clear}>
              <SearchInput
                label={t('donor.history.search')}
                placeholder={t('donor.history.searchPlaceholder')}
                value={q}
                onChange={(value) => filters.set('q', value)}
              />
              {years.length > 1 && (
                <FilterSelect
                  label={t('donor.history.year')}
                  allLabel={t('donor.history.allYears')}
                  value={year}
                  onChange={(value) => filters.set('year', value)}
                  options={years.map((y) => ({ value: y, label: y }))}
                />
              )}
            </FilterBar>
            {rows.length === 0 ? (
              <StateView
                state="no-results"
                title={t('donor.history.noMatch')}
                description={t('donor.history.noMatchBody')}
                action={
                  <Button variant="outline" onClick={filters.clear}>
                    {t('common.clearFilters')}
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
  const { t } = useTranslation();
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
        {t('common.unit', { count: donation.units })}
      </span>
    </li>
  );
}

function NextDonationCallout({ history }: { history: DonationHistory }) {
  return (
    <p className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong px-4 py-3.5 text-label text-text-muted">
      <CalendarCheck size={20} className="shrink-0 text-text-subtle" aria-hidden="true" />
      <span>
        {history.eligible ? (
          <Trans
            i18nKey="donor.history.canDonateNow"
            components={{ b: <strong className="text-ink" />, link: <Link to="/donor/requests" /> }}
          />
        ) : (
          <Trans
            i18nKey="donor.history.eligibleAgain"
            values={{ date: formatDate(history.nextEligibleDate as string) }}
            components={{ b: <strong className="text-ink" /> }}
          />
        )}
      </span>
    </p>
  );
}
