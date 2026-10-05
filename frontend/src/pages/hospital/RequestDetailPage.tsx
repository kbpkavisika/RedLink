import { ArrowLeft, CheckCircle2, Phone, RefreshCw, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
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
  type BadgeTone,
  type Column,
} from '../../components/ui';
import { useMatches, useRequest } from '../../hooks/useRequests';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { compatibleDonorGroups } from '../../lib/bloodGroups';
import { formatBloodGroup, formatInstant } from '../../lib/format';
import { matchesQuery } from '../../lib/search';
import { CloseRequestPanel, type CloseMode } from './CloseRequestPanel';
import { ResponsesPanel } from './ResponsesPanel';
import type { ApiError, BloodRequestDetail, MatchedDonor, RequestOverview, RequestStatus } from '../../types';

const STATUS: Record<RequestStatus, { label: string; tone: BadgeTone }> = {
  OPEN: { label: 'Open', tone: 'info' },
  FULFILLED: { label: 'Fulfilled', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
};

const backToRequests = (
  <LinkButton to="/hospital/requests" variant="outline" leftIcon={<ArrowLeft size={16} aria-hidden="true" />}>
    Back to requests
  </LinkButton>
);

/**
 * /hospital/requests/:id (H5, H12): the request, then every donor who can give to it, best match first.
 * Filters live in the URL (?group=O-&city=same) so reloading keeps them.
 * Between them, donors' replies (H7): who is coming, who withdrew, who declined.
 */
export function RequestDetailPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;

  if (!valid) {
    return (
      <Panel>
        <StateView
          state="error"
          title="This request doesn't exist"
          description="Check the link, or open the request from your list."
          action={backToRequests}
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
  if (error.status === 404) {
    return (
      <StateView
        state="error"
        title="We couldn't find this request"
        description="It may belong to another hospital, or the link is wrong."
        action={backToRequests}
      />
    );
  }
  return (
    <StateView
      state="error"
      title="We couldn't load this request"
      error={error}
      action={
        <Button loading={retrying} onClick={onRetry} leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}>
          Try again
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
  const { request, notifiedCount, donatedDonorIds } = overview;
  const status = STATUS[request.status];
  return (
    <Panel padded>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <BloodGroupBadge group={request.bloodGroup} />
          <h2 className="font-display text-display-sm text-ink">#{request.reference}</h2>
          <UrgencyTag urgency={request.urgency} />
          <Badge tone={status.tone}>{status.label}</Badge>
          {onClose && (
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => onClose('cancel')}>
                Cancel request
              </Button>
              <Button onClick={() => onClose('fulfil')} leftIcon={<CheckCircle2 size={16} aria-hidden="true" />}>
                Mark fulfilled
              </Button>
            </div>
          )}
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Needed">
            {request.unitsNeeded} {request.unitsNeeded === 1 ? 'unit' : 'units'} of {formatBloodGroup(request.bloodGroup)}
          </Fact>
          <Fact label="Needed by">{formatInstant(request.neededBy, true)}</Fact>
          <Fact label="City">{request.city}</Fact>
          {request.status === 'FULFILLED' ? (
            <Fact label="Donated">
              {donatedDonorIds.length} {donatedDonorIds.length === 1 ? 'donor' : 'donors'} · {notifiedCount} notified
            </Fact>
          ) : (
            <Fact label="Notified when posted">
              {notifiedCount} {notifiedCount === 1 ? 'donor' : 'donors'}
            </Fact>
          )}
        </dl>

        <p className="text-caption text-text-subtle">
          Posted by {request.createdBy} on {formatInstant(request.createdAt, true)}
          {request.closedAt && ` · ${status.label} ${formatInstant(request.closedAt, true)}`}
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

const columns: Column<MatchedDonor & { rank: number }>[] = [
  {
    key: 'rank',
    header: <span className="sr-only">Rank</span>,
    cell: (match) => <span className="font-mono text-caption text-text-subtle">{match.rank}</span>,
    className: 'w-10',
  },
  {
    key: 'donor',
    header: 'Donor',
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
    header: 'Match',
    cell: (match) => (
      <div className="flex flex-wrap gap-1.5">
        {match.exactMatch ? <Badge tone="success">Exact group</Badge> : <Badge>Compatible</Badge>}
        {match.sameCity && <Badge tone="info">Same city</Badge>}
      </div>
    ),
  },
  {
    key: 'last',
    header: 'Last donation',
    cell: (match) =>
      match.daysSinceLastDonation === null ? (
        <span className="text-text-subtle">Never</span>
      ) : (
        <span className="whitespace-nowrap">{match.daysSinceLastDonation} days ago</span>
      ),
  },
  {
    key: 'phone',
    header: 'Phone',
    align: 'right',
    cell: (match) =>
      match.phone ? (
        <a
          href={`tel:${match.phone}`}
          className="inline-flex items-center gap-1.5 whitespace-nowrap no-underline"
          aria-label={`Call ${match.name}, ${match.phone}`}
        >
          <Phone size={14} aria-hidden="true" />
          {match.phone}
        </a>
      ) : (
        <span className="text-text-subtle">—</span>
      ),
  },
];

const MATCH_FILTERS = ['q', 'group', 'city'] as const;

function MatchList({ request }: { request: BloodRequestDetail }) {
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

  const toolbar = open && (
    <FilterBar active={filters.active} onClear={filters.clear}>
      <SearchInput label="Search matched donors" placeholder="Donor name or phone" value={q} onChange={(value) => filters.set('q', value)} />
      <FilterSelect
        label="Blood group"
        allLabel="All compatible groups"
        value={group}
        onChange={(value) => filters.set('group', value)}
        options={groups.map((g) => ({
          value: g,
          label: `${formatBloodGroup(g)}${g === request.bloodGroup ? ' (exact)' : ''}`,
        }))}
      />
      <FilterSelect
        label="City"
        allLabel="All cities"
        value={sameCity ? 'same' : ''}
        onChange={(value) => filters.set('city', value)}
        options={[{ value: 'same', label: `${request.city} only` }]}
      />
    </FilterBar>
  );

  let body: ReactNode;
  if (!open) {
    body = (
      <StateView
        state="empty"
        icon={Users}
        title="This request is closed"
        description="Closed requests aren't matched any more, so nobody else will be contacted."
      />
    );
  } else if (isPending) {
    body = <StateView state="loading" />;
  } else if (isError) {
    body = (
      <StateView
        state="error"
        title="We couldn't load matches"
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
    );
  } else if (rows.length === 0 && filters.active) {
    // H12: say which filters found nobody, and offer the widest useful alternative
    const what = group ? `${formatBloodGroup(group)} donors` : 'compatible donors';
    const where = sameCity ? ` in ${request.city}` : '';
    const named = q ? ` named "${q}"` : '';
    body = (
      <StateView
        state="no-results"
        title={`No eligible ${what}${where}${named}`}
        description="Every donor shown here is available and hasn't donated in the last 90 days. Widen the search to see more."
        secondaryAction={
          <Button variant="outline" onClick={filters.clear}>
            Clear filters
          </Button>
        }
        action={
          group ? (
            <Button variant="dark" onClick={() => filters.set('group', null)}>
              Show compatible
            </Button>
          ) : sameCity ? (
            <Button variant="dark" onClick={() => filters.set('city', null)}>
              Show all cities
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
        title="No matching donors right now"
        description={`No donor who can give ${formatBloodGroup(request.bloodGroup)} is available and eligible today. The request stays open, and new matches appear here as donors become eligible.`}
      />
    );
  } else {
    body = (
      <div aria-busy={isPlaceholderData || undefined} className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        <Table
          caption={`Donors who can give to #${request.reference}, best match first`}
          rows={rows}
          rowKey={(match) => match.donorId}
          columns={columns}
        />
      </div>
    );
  }

  return (
    <Panel
      title="Matched donors"
      actions={
        open && matches && matches.length > 0 && (
          <span className="text-label text-text-subtle">
            {filters.active ? `${rows.length} shown` : `${matches.length} total`} · best match first
          </span>
        )
      }
    >
      {toolbar}
      {body}
    </Panel>
  );
}