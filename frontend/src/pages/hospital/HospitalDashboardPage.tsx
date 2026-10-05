import { CheckCircle2, ClipboardList, HeartHandshake, Plus, RefreshCw, Siren } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import {
  BloodGroupBadge,
  Button,
  LinkButton,
  Panel,
  StatTile,
  StateView,
  UrgencyTag,
} from '../../components/ui';
import { useHospitalRequests } from '../../hooks/useRequests';
import { formatInstant } from '../../lib/format';
import { timeAgo } from '../../lib/notifications';
import type { RequestListItem, Urgency } from '../../types';
import { RepliesSummary } from './RepliesSummary';

const URGENCY_RANK: Record<Urgency, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const SOON_MS = 6 * 60 * 60 * 1000;

/**
 * /hospital (H11): today's numbers and the open requests that need attention, most urgent first.
 * Shares its data with the Requests table; refreshes every minute.
 */
export function HospitalDashboardPage() {
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch, isRefetching } = useHospitalRequests();
  // Read once per visit, for the "due within 6 hours" flag
  const [now] = useState(() => Date.now());

  if (isPending) {
    return (
      <Panel>
        <StateView state="loading" rows={4} />
      </Panel>
    );
  }
  if (isError) {
    return (
      <Panel>
        <StateView
          state="error"
          title="We couldn't load your dashboard"
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
      </Panel>
    );
  }

  // Most urgent first, then the soonest deadline
  const open = data.requests
    .filter((request) => request.status === 'OPEN')
    .sort(
      (a, b) =>
        URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
        new Date(a.neededBy).getTime() - new Date(b.neededBy).getTime(),
    );
  const recentlyClosed = data.requests.filter((request) => request.status !== 'OPEN').slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-primary uppercase">{user?.hospitalName}</p>
          <h2 className="font-display text-display-sm text-ink">Today at a glance</h2>
        </div>
        <LinkButton to="/hospital/requests/new" leftIcon={<Plus size={16} aria-hidden="true" />}>
          New request
        </LinkButton>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Open requests" value={data.open} icon={ClipboardList} />
        <StatTile label="Critical and open" value={data.criticalOpen} icon={Siren} tone="alert" />
        <StatTile label="Donors coming" value={data.donorsComing} icon={HeartHandshake} tone="success" />
        <StatTile label="Fulfilled" value={data.fulfilledLast30Days} icon={CheckCircle2} hint="Last 30 days" />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title="Open requests"
          actions={
            data.requests.length > 0 && (
              <LinkButton to="/hospital/requests" variant="text" size="sm">
                All requests
              </LinkButton>
            )
          }
        >
          {open.length === 0 ? (
            <StateView
              state="empty"
              icon={ClipboardList}
              title="No open requests"
              description="When you need blood, post a request and RedLink notifies the best-matched donors."
              action={<LinkButton to="/hospital/requests/new">New request</LinkButton>}
            />
          ) : (
            <ul className="divide-y divide-neutral-soft">
              {open.map((request) => (
                <OpenRequestRow key={request.id} request={request} now={now} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recently closed">
          {recentlyClosed.length === 0 ? (
            <p className="px-5 py-8 text-center text-label text-text-subtle">Fulfilled and cancelled requests appear here.</p>
          ) : (
            <ul className="divide-y divide-neutral-soft">
              {recentlyClosed.map((request) => (
                <li key={request.id}>
                  <Link
                    to={`/hospital/requests/${request.id}`}
                    className="flex items-center gap-3 px-5 py-3 text-ink no-underline hover:bg-bg"
                  >
                    <BloodGroupBadge group={request.bloodGroup} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">#{request.reference}</span>
                      <span className="block text-caption text-text-subtle">
                        {request.status === 'FULFILLED' ? `${request.donated} donated` : request.status.toLowerCase()} ·{' '}
                        {request.closedAt && timeAgo(request.closedAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function OpenRequestRow({ request, now }: { request: RequestListItem; now: number }) {
  const dueSoon = new Date(request.neededBy).getTime() - now < SOON_MS;
  return (
    <li>
      <Link
        to={`/hospital/requests/${request.id}`}
        className="flex flex-wrap items-center gap-4 px-5 py-4 text-ink no-underline hover:bg-bg focus-visible:bg-bg focus-visible:outline-none"
      >
        <BloodGroupBadge group={request.bloodGroup} size="md" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            #{request.reference} · {request.unitsNeeded} {request.unitsNeeded === 1 ? 'unit' : 'units'}
            <UrgencyTag urgency={request.urgency} />
          </p>
          <p className="text-caption text-text-subtle">
            Needed by {formatInstant(request.neededBy, true)}
            {dueSoon && <strong className="ml-1 text-warning">· due within 6 hours</strong>}
          </p>
        </div>
        <div className="text-right text-label">
          <RepliesSummary request={request} />
          <p className="text-caption text-text-subtle">
            {request.coming} of {request.unitsNeeded} covered
          </p>
        </div>
      </Link>
    </li>
  );
}
