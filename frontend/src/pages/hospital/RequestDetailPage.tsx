import { ArrowLeft, CheckCircle2, Phone, RefreshCw, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  Badge,
  BloodGroupBadge,
  Button,
  FilterBar,
  FilterSelect,
  LinkButton,
  Panel,
  SearchInput,
  StateView,
  Table,
  UrgencyTag,
  type Column,
} from '../../components/ui';
import { useMatches, useRequest } from '../../hooks/useRequests';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { compatibleDonorGroups } from '../../lib/bloodGroups';
import { formatBloodGroup, formatInstant } from '../../lib/format';
import { REQUEST_STATUS } from '../../lib/requestStatus';
import { matchesQuery } from '../../lib/search';
import { CloseRequestPanel, type CloseMode } from './CloseRequestPanel';
import { ResponsesPanel } from './ResponsesPanel';
import type { ApiError, BloodRequestDetail, MatchedDonor, RequestOverview } from '../../types';

function BackToRequests() {
  const { t } = useTranslation();
  return (
    <LinkButton to="/hospital/requests" variant="outline" leftIcon={<ArrowLeft size={16} aria-hidden="true" />}>
      {t('hospital.detail.backToRequests')}
    </LinkButton>
  );
}

/**
 * /hospital/requests/:id (H5, H12): the request, then every donor who can give to it, best match first.
 * Filters live in the URL (?group=O-&city=same) so reloading keeps them.
 * Between them, donors' replies (H7): who is coming, who withdrew, who declined.
 */
export function RequestDetailPage() {
  const { t } = useTranslation();
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;

  if (!valid) {
    return (
      <Panel>
        <StateView
          state="error"
          title={t('hospital.detail.invalidTitle')}
          description={t('hospital.detail.invalidBody')}
          action={<BackToRequests />}
        />
      </Panel>
    );
  }
  return <RequestDetail id={id} />;
}

function RequestDetail({ id }: { id: number }) {
  const { data, isPending, isError, error, refetch, isRefetching } = useRequest(id);
  const [closing, setClosing] = useState<CloseMode | null>(null);

  if (isPending) {
    return (
      <Panel>
        <StateView state="loading" rows={3} />
      </Panel>
    );
  }
  if (isError) {
    return (
      <Panel>
        <RequestError error={error} retrying={isRefetching} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <RequestSummary overview={data} onClose={data.request.status === 'OPEN' ? setClosing : undefined} />
      {closing && data.request.status === 'OPEN' && (
        <CloseRequestPanel request={data.request} mode={closing} onClose={() => setClosing(null)} />
      )}
      <ResponsesPanel
        request={data.request}
        notifiedCount={data.notifiedCount}
        donatedDonorIds={data.donatedDonorIds}
      />
      <MatchList request={data.request} />
    </div>
  );
}

function RequestError({ error, retrying, onRetry }: { error: ApiError; retrying: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  if (error.status === 404) {
    return (
      <StateView
        state="error"
        title={t('hospital.detail.notFoundTitle')}
        description={t('hospital.detail.notFoundBody')}
        action={<BackToRequests />}
      />
    );
  }
  return (
    <StateView
      state="error"
      title={t('hospital.detail.loadError')}
      error={error}
      action={
        <Button loading={retrying} onClick={onRetry} leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}>
          {t('common.tryAgain')}
        </Button>
      }
    />
  );
}

interface RequestSummaryProps {
  overview: RequestOverview;
  // Only while the request is OPEN: opens the fulfil or cancel panel
  onClose?: (mode: CloseMode) => void;
}

function RequestSummary({ overview, onClose }: RequestSummaryProps) {
  const { t } = useTranslation();
  const { request, notifiedCount, donatedDonorIds } = overview;
  const statusLabel = t(`status.request.${request.status}`);
  return (
    <Panel padded>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <BloodGroupBadge group={request.bloodGroup} />
          <h2 className="font-display text-display-sm text-ink">#{request.reference}</h2>
          <UrgencyTag urgency={request.urgency} />
          <Badge tone={REQUEST_STATUS[request.status].tone}>{statusLabel}</Badge>
          {onClose && (
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => onClose('cancel')}>
                {t('hospital.detail.cancelRequest')}
              </Button>
              <Button onClick={() => onClose('fulfil')} leftIcon={<CheckCircle2 size={16} aria-hidden="true" />}>
                {t('hospital.detail.markFulfilled')}
              </Button>
            </div>
          )}
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label={t('hospital.detail.needed')}>
            {t('common.unitsOf', { count: request.unitsNeeded, group: formatBloodGroup(request.bloodGroup) })}
          </Fact>
          <Fact label={t('common.neededBy')}>{formatInstant(request.neededBy, true)}</Fact>
          <Fact label={t('common.city')}>{request.city}</Fact>
          {request.status === 'FULFILLED' ? (
            <Fact label={t('hospital.detail.donated')}>
              {t('hospital.detail.donatedValue', { count: donatedDonorIds.length, notified: notifiedCount })}
            </Fact>
          ) : (
            <Fact label={t('hospital.detail.notifiedWhenPosted')}>{t('common.donorCount', { count: notifiedCount })}</Fact>
          )}
        </dl>

        <p className="text-caption text-text-subtle">
          {t('hospital.detail.postedBy', { name: request.createdBy, date: formatInstant(request.createdAt, true) })}
          {request.closedAt &&
            ` · ${t('hospital.detail.closedOn', { status: statusLabel, date: formatInstant(request.closedAt, true) })}`}
        </p>
      </div>
    </Panel>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-text-subtle">{label}</dt>
      <dd className="text-body font-medium text-ink">{children}</dd>
    </div>
  );
}

const MATCH_FILTERS = ['q', 'group', 'city'] as const;

function MatchList({ request }: { request: BloodRequestDetail }) {
  const { t } = useTranslation();
  const filters = useUrlFilters(MATCH_FILTERS);
  const groups = compatibleDonorGroups(request.bloodGroup);
  const group = groups.find((g) => g === filters.values.group) ?? '';
  const sameCity = filters.values.city === 'same';
  const { q } = filters.values;

  // Group and city are applied by the server; the name search narrows what came back
  const { data: matches, isPending, isError, error, refetch, isRefetching, isPlaceholderData } = useMatches(request.id, {
    bloodGroup: group || undefined,
    city: sameCity ? request.city : undefined,
  });
  // Rank first, then search, so a donor found by name keeps their real place in the ranking
  const ranked = (matches ?? []).map((match, index) => ({ ...match, rank: index + 1 }));
  const rows = ranked.filter((match) => matchesQuery(q, match.name, match.phone, match.city));

  const open = request.status === 'OPEN';

  const columns: Column<MatchedDonor & { rank: number }>[] = [
    {
      key: 'rank',
      header: <span className="sr-only">{t('hospital.detail.rank')}</span>,
      cell: (match) => <span className="font-mono text-caption text-text-subtle">{match.rank}</span>,
      className: 'w-10',
    },
    {
      key: 'donor',
      header: t('common.donor'),
      cell: (match) => (
        <div className="flex items-center gap-3">
          <BloodGroupBadge group={match.bloodGroup} />
          <div className="min-w-0">
            <p className="truncate font-medium">{match.name}</p>
            <p className="text-caption text-text-subtle">{match.city}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'why',
      header: t('hospital.detail.match'),
      cell: (match) => (
        <div className="flex flex-wrap gap-1.5">
          {match.exactMatch ? (
            <Badge tone="success">{t('hospital.detail.exactGroup')}</Badge>
          ) : (
            <Badge>{t('hospital.detail.compatible')}</Badge>
          )}
          {match.sameCity && <Badge tone="info">{t('hospital.detail.sameCity')}</Badge>}
        </div>
      ),
    },
    {
      key: 'last',
      header: t('hospital.detail.lastDonation'),
      cell: (match) =>
        match.daysSinceLastDonation === null ? (
          <span className="text-text-subtle">{t('common.never')}</span>
        ) : (
          <span className="whitespace-nowrap">{t('time.daysAgo', { count: match.daysSinceLastDonation })}</span>
        ),
    },
    {
      key: 'phone',
      header: t('common.phone'),
      align: 'right',
      cell: (match) =>
        match.phone ? (
          <a
            href={`tel:${match.phone}`}
            className="inline-flex items-center gap-1.5 whitespace-nowrap no-underline"
            aria-label={t('common.callLabel', { name: match.name, phone: match.phone })}
          >
            <Phone size={14} aria-hidden="true" />
            {match.phone}
          </a>
        ) : (
          <span className="text-text-subtle">—</span>
        ),
    },
  ];

  const toolbar = open && (
    <FilterBar active={filters.active} onClear={filters.clear}>
      <SearchInput
        label={t('hospital.detail.searchMatches')}
        placeholder={t('common.namePhonePlaceholder')}
        value={q}
        onChange={(value) => filters.set('q', value)}
      />
      <FilterSelect
        label={t('common.bloodGroup')}
        allLabel={t('hospital.detail.allCompatible')}
        value={group}
        onChange={(value) => filters.set('group', value)}
        options={groups.map((g) => ({
          value: g,
          label: g === request.bloodGroup ? t('hospital.detail.exactSuffix', { group: formatBloodGroup(g) }) : formatBloodGroup(g),
        }))}
      />
      <FilterSelect
        label={t('common.city')}
        allLabel={t('common.allCities')}
        value={sameCity ? 'same' : ''}
        onChange={(value) => filters.set('city', value)}
        options={[{ value: 'same', label: t('hospital.detail.cityOnly', { city: request.city }) }]}
      />
    </FilterBar>
  );

  let body: ReactNode;
  if (!open) {
    body = (
      <StateView
        state="empty"
        icon={Users}
        title={t('hospital.detail.closedTitle')}
        description={t('hospital.detail.closedBody')}
      />
    );
  } else if (isPending) {
    body = <StateView state="loading" />;
  } else if (isError) {
    body = (
      <StateView
        state="error"
        title={t('hospital.detail.matchesLoadError')}
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
    );
  } else if (rows.length === 0 && filters.active) {
    // H12: say which filters found nobody, and offer the widest useful alternative
    const groupLabel = group ? formatBloodGroup(group) : '';
    const title = q
      ? t('hospital.detail.noEligibleNamed', { q })
      : group && sameCity
        ? t('hospital.detail.noEligibleGroupCity', { group: groupLabel, city: request.city })
        : group
          ? t('hospital.detail.noEligibleGroup', { group: groupLabel })
          : sameCity
            ? t('hospital.detail.noEligibleCity', { city: request.city })
            : t('hospital.detail.noEligible');
    body = (
      <StateView
        state="no-results"
        title={title}
        description={t('hospital.detail.noEligibleBody')}
        secondaryAction={
          <Button variant="outline" onClick={filters.clear}>
            {t('common.clearFilters')}
          </Button>
        }
        action={
          group ? (
            <Button variant="dark" onClick={() => filters.set('group', null)}>
              {t('hospital.detail.showCompatible')}
            </Button>
          ) : sameCity ? (
            <Button variant="dark" onClick={() => filters.set('city', null)}>
              {t('hospital.detail.showAllCities')}
            </Button>
          ) : undefined
        }
      />
    );
  } else if (rows.length === 0) {
    body = (
      <StateView
        state="empty"
        icon={Users}
        title={t('hospital.detail.noMatchingNow')}
        description={t('hospital.detail.noMatchingNowBody', { group: formatBloodGroup(request.bloodGroup) })}
      />
    );
  } else {
    body = (
      <div aria-busy={isPlaceholderData || undefined} className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        <Table
          caption={t('hospital.detail.matchesCaption', { ref: request.reference })}
          rows={rows}
          rowKey={(match) => match.donorId}
          columns={columns}
        />
      </div>
    );
  }

  return (
    <Panel
      title={t('hospital.detail.matchedDonors')}
      actions={
        open && matches && matches.length > 0 && (
          <span className="text-label text-text-subtle">
            {filters.active
              ? t('hospital.detail.shownCount', { count: rows.length })
              : t('hospital.detail.totalCount', { count: matches.length })}
          </span>
        )
      }
    >
      {toolbar}
      {body}
    </Panel>
  );
}
