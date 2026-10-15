import { Building2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  FilterBar,
  FilterSelect,
  HospitalStatusBadge,
  Panel,
  SearchInput,
  SegmentedControl,
  StateView,
  Table,
  type Column,
  type SegmentOption,
} from '../../components/ui';
import { useHospitals } from '../../hooks/useAdminHospitals';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { formatInstant } from '../../lib/format';
import { matchesQuery } from '../../lib/search';
import type { HospitalStatus, HospitalSummary } from '../../types';
import { HospitalReviewPanel } from './HospitalReviewPanel';

type Tab = HospitalStatus | 'ALL';
const TABS: Tab[] = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];

const SEARCH_FILTERS = ['q', 'city'] as const;

function parseTab(value: string | null): Tab {
  return TABS.find((tab) => tab === value) ?? 'PENDING';
}

/**
 * /admin/hospitals: the approval queue (A1) and the review panel (A2–A4).
 * The tab and the open hospital live in the URL (?status=PENDING&hospital=12), so reloading or sharing keeps them.
 */
export function HospitalsPage() {
  const { t } = useTranslation();
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

  // Search and city narrow every tab, so the counts show where the matches are
  const filters = useUrlFilters(SEARCH_FILTERS);
  const { q, city } = filters.values;
  const cities = [...new Set((hospitals ?? []).map((h) => h.city.trim()))].sort((a, b) => a.localeCompare(b));
  const searched = (hospitals ?? []).filter(
    (h) =>
      matchesQuery(q, h.name, h.registrationNo, h.city) && (!city || h.city.trim().toLowerCase() === city.toLowerCase()),
  );

  const inTab = (list: HospitalSummary[], tabName: Tab) => list.filter((h) => tabName === 'ALL' || h.status === tabName);
  const counts = Object.fromEntries(
    TABS.map((tabName) => [tabName, hospitals ? inTab(searched, tabName).length : undefined]),
  ) as Record<Tab, number | undefined>;

  const tabLabel = (tabName: Tab) => (tabName === 'ALL' ? t('common.all') : t(`status.hospital.${tabName}`));
  const options: SegmentOption<Tab>[] = TABS.map((tabName) => ({
    value: tabName,
    label: tabLabel(tabName),
    count: counts[tabName],
  }));

  // The queue is oldest first, so nobody waits longest; other tabs show the newest first (as the API sends them)
  const rows = inTab(searched, tab);
  if (tab === 'PENDING') rows.reverse();
  const tabTotal = inTab(hospitals ?? [], tab).length;

  const columns: Column<HospitalSummary>[] = [
    {
      key: 'hospital',
      header: t('common.hospital'),
      cell: (hospital) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{hospital.name}</p>
          <p className="font-mono text-caption text-text-subtle">{hospital.registrationNo}</p>
        </div>
      ),
    },
    { key: 'city', header: t('common.city'), cell: (hospital) => hospital.city },
    {
      key: 'registered',
      header: t('common.registered'),
      cell: (hospital) => <span className="whitespace-nowrap">{formatInstant(hospital.createdAt)}</span>,
    },
    { key: 'status', header: t('common.status'), cell: (hospital) => <HospitalStatusBadge status={hospital.status} /> },
    {
      key: 'action',
      header: <span className="sr-only">{t('admin.hospitals.action')}</span>,
      align: 'right',
      cell: (hospital) => (
        <Button
          variant={hospital.status === 'PENDING' ? 'outline' : 'text'}
          size="sm"
          aria-label={
            hospital.status === 'PENDING'
              ? t('admin.hospitals.reviewLabel', { name: hospital.name })
              : t('admin.hospitals.viewLabel', { name: hospital.name })
          }
          onClick={() => update({ hospital: String(hospital.id) })}
        >
          {hospital.status === 'PENDING' ? t('admin.hospitals.review') : t('common.view')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl
        label={t('admin.hospitals.filterLabel')}
        options={options}
        value={tab}
        onChange={(value) => update({ status: value })}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Panel title={t(`admin.hospitals.title.${tab}`)}>
          {hospitals && hospitals.length > 0 && (
            <FilterBar shown={rows.length} total={tabTotal} active={filters.active} onClear={filters.clear}>
              <SearchInput
                label={t('admin.hospitals.search')}
                placeholder={t('admin.hospitals.searchPlaceholder')}
                value={q}
                onChange={(value) => filters.set('q', value)}
              />
              <FilterSelect
                label={t('common.city')}
                allLabel={t('common.allCities')}
                value={city}
                onChange={(value) => filters.set('city', value)}
                options={cities.map((c) => ({ value: c, label: c }))}
              />
            </FilterBar>
          )}
          {isPending ? (
            <StateView state="loading" />
          ) : isError ? (
            <StateView
              state="error"
              title={t('admin.hospitals.loadError')}
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
          ) : rows.length === 0 && filters.active ? (
            <StateView
              state="no-results"
              title={t(`admin.hospitals.noMatch.${tab}`)}
              description={
                tab !== 'ALL' && counts.ALL
                  ? t('admin.hospitals.otherTabs', { count: counts.ALL })
                  : t('admin.hospitals.noMatchBody')
              }
              secondaryAction={
                <Button variant="outline" onClick={filters.clear}>
                  {t('common.clearFilters')}
                </Button>
              }
              action={
                tab !== 'ALL' && counts.ALL ? (
                  <Button variant="dark" onClick={() => update({ status: 'ALL' })}>
                    {t('admin.hospitals.showAll')}
                  </Button>
                ) : undefined
              }
            />
          ) : rows.length === 0 ? (
            <StateView
              state="empty"
              icon={Building2}
              title={t(`admin.hospitals.empty.${tab}`)}
              description={t(`admin.hospitals.emptyBody.${tab}`)}
            />
          ) : (
            <Table
              caption={t(`admin.hospitals.title.${tab}`)}
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
