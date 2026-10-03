import { ArrowLeft, Phone, RefreshCw, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Badge,
  BloodGroupBadge,
  Button,
  LinkButton,
  Panel,
  SegmentedControl,
  Select,
  StateView,
  Table,
  UrgencyTag,
  type BadgeTone,
  type Column,
} from '../../components/ui';
import { useMatches, useRequest } from '../../hooks/useRequests';
import { compatibleDonorGroups } from '../../lib/bloodGroups';
import { formatBloodGroup, formatInstant } from '../../lib/format';
import type { ApiError, BloodRequestDetail, MatchedDonor, RequestStatus } from '../../types';

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
 * Donor responses join this page in the donor-responses phase.
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
      <RequestSummary request={data.request} notifiedCount={data.notifiedCount} />
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

function RequestSummary({ request, notifiedCount }: { request: BloodRequestDetail; notifiedCount: number }) {
  const status = STATUS[request.status];
  return (
    <Panel padded>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <BloodGroupBadge group={request.bloodGroup} />
          <h2 className="font-display text-display-sm text-ink">#{request.reference}</h2>
          <UrgencyTag urgency={request.urgency} />
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Needed">
            {request.unitsNeeded} {request.unitsNeeded === 1 ? 'unit' : 'units'} of {formatBloodGroup(request.bloodGroup)}
          </Fact>
          <Fact label="Needed by">{formatInstant(request.neededBy, true)}</Fact>
          <Fact label="City">{request.city}</Fact>
          <Fact label="Notified when posted">
            {notifiedCount} {notifiedCount === 1 ? 'donor' : 'donors'}
          </Fact>
        </dl>

        <p className="text-caption text-text-subtle">
          Posted by {request.createdBy} on {formatInstant(request.createdAt, true)}
          {request.closedAt && ` · Closed ${formatInstant(request.closedAt, true)}`}
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

type CityFilter = 'all' | 'same';

function MatchList({ request }: { request: BloodRequestDetail }) {
  const [params, setParams] = useSearchParams();
  const groups = compatibleDonorGroups(request.bloodGroup);
  const group = groups.find((g) => g === params.get('group')) ?? '';
  const cityFilter: CityFilter = params.get('city') === 'same' ? 'same' : 'all';
  const filtered = group !== '' || cityFilter === 'same';

  const { data: matches, isPending, isError, error, refetch, isRefetching, isPlaceholderData } = useMatches(request.id, {
    bloodGroup: group || undefined,
    city: cityFilter === 'same' ? request.city : undefined,
  });

  const update = (changes: Record<string, string | null>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
        return next;
      },
      { replace: true },
    );
  };

  const open = request.status === 'OPEN';

  const filters = open && (
    <div className="flex flex-wrap items-end gap-3 border-b border-border px-5 py-4">
      <Select
        label="Blood group"
        className="w-full sm:w-56"
        value={group}
        onChange={(event) => update({ group: event.target.value || null })}
      >
        <option value="">All compatible groups</option>
        {groups.map((g) => (
          <option key={g} value={g}>
            {formatBloodGroup(g)}
            {g === request.bloodGroup ? ' (exact)' : ''}
          </option>
        ))}
      </Select>
      <SegmentedControl<CityFilter>
        label="Filter donors by city"
        value={cityFilter}
        onChange={(value) => update({ city: value === 'same' ? 'same' : null })}
        options={[
          { value: 'all', label: 'All cities' },
          { value: 'same', label: `${request.city} only` },
        ]}
      />
    </div>
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
  } else if (matches.length === 0 && filtered) {
    // H12: say which filters found nobody, and offer the widest useful alternative
    const what = group ? `${formatBloodGroup(group)} donors` : 'compatible donors';
    const where = cityFilter === 'same' ? ` in ${request.city}` : '';
    body = (
      <StateView
        state="no-results"
        title={`No eligible ${what}${where}`}
        description="Every donor shown here is available and hasn't donated in the last 90 days. Widen the search to see more."
        secondaryAction={
          <Button variant="outline" onClick={() => update({ group: null, city: null })}>
            Clear filters
          </Button>
        }
        action={
          group ? (
            <Button variant="dark" onClick={() => update({ group: null })}>
              Show compatible
            </Button>
          ) : (
            <Button variant="dark" onClick={() => update({ city: null })}>
              Show all cities
            </Button>
          )
        }
      />
    );
  } else if (matches.length === 0) {
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
          rows={matches.map((match, index) => ({ ...match, rank: index + 1 }))}
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
            {matches.length} {filtered ? 'shown' : 'total'} · best match first
          </span>
        )
      }
    >
      {filters}
      {body}
    </Panel>
  );
}
