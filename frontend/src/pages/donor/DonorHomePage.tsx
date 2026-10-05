import { ArrowRight, CalendarClock, MapPin, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  BloodGroupBadge,
  Button,
  EligibilityRing,
  LinkButton,
  Panel,
  StateView,
  Switch,
  UrgencyTag,
} from '../../components/ui';
import { useIncomingRequests, useMyProfile, useSetAvailability } from '../../hooks/useDonorSelf';
import { formatBloodGroup, formatDate, formatInstant } from '../../lib/format';
import type { DonorProfile, IncomingRequest } from '../../types';

const PREVIEW = 3;

function greeting(now = new Date()): string {
  const hour = now.getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/**
 * /donor (D3, D4, D5): status cards on the left (eligibility, availability), requests that need the donor
 * on the right (design.md §7). Replying to requests happens on /donor/requests.
 */
export function DonorHomePage() {
  const profile = useMyProfile();

  if (profile.isPending) {
    return (
      <Panel>
        <StateView state="loading" rows={3} />
      </Panel>
    );
  }
  if (profile.isError) {
    return (
      <Panel>
        <StateView
          state="error"
          title="We couldn't load your donor profile"
          error={profile.error}
          action={
            <Button
              loading={profile.isRefetching}
              onClick={() => void profile.refetch()}
              leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}
            >
              Try again
            </Button>
          }
        />
      </Panel>
    );
  }

  const me = profile.data;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-label text-text-muted">{greeting()}</p>
          <h2 className="font-display text-display-sm text-ink">{me.fullName}</h2>
        </div>
        <BloodGroupBadge group={me.bloodGroup} size="lg" />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <EligibilityCard me={me} />
          <AvailabilityCard me={me} />
        </div>
        <NeedsYouNow />
      </div>
    </div>
  );
}

// D4: "You can donate" or when they can again, with the ring
function EligibilityCard({ me }: { me: DonorProfile }) {
  const lastDonation =
    me.lastDonationDate === null
      ? "You haven't donated through RedLink yet."
      : `Last donation ${formatDate(me.lastDonationDate)} · ${me.daysSinceLastDonation} ${me.daysSinceLastDonation === 1 ? 'day' : 'days'} ago`;

  return (
    <Panel padded>
      <div className="flex items-center gap-4">
        <EligibilityRing
          daysSinceLastDonation={me.daysSinceLastDonation}
          daysBetweenDonations={me.daysBetweenDonations}
          eligible={me.eligible}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-title-md text-ink">
            {me.eligible ? 'You can donate' : `You can donate again on ${formatDate(me.nextEligibleDate as string)}`}
          </p>
          <p className="text-label text-text-muted">{lastDonation}</p>
        </div>
      </div>
      {!me.eligible && (
        <p className="mt-4 rounded-xl border border-dashed border-border-strong px-4 py-3.5 text-label text-text-muted">
          Donors wait <strong className="text-ink">{me.daysBetweenDonations} days</strong> between donations so the
          body can recover. You'll still see requests, and can accept them from{' '}
          <strong className="text-ink">{formatDate(me.nextEligibleDate as string)}</strong>.
        </p>
      )}
    </Panel>
  );
}

// D3: pausing alerts while travelling or unwell
function AvailabilityCard({ me }: { me: DonorProfile }) {
  const setAvailability = useSetAvailability();

  const change = (available: boolean) =>
    setAvailability.mutate(available, {
      onSuccess: () =>
        toast.success(available ? "You're available again. We'll alert you to matching requests." : 'Alerts paused.'),
      onError: (error) => toast.error(error.message),
    });

  return (
    <Panel padded>
      <Switch
        label="Available for requests"
        description={
          me.available
            ? 'Turn off while travelling or unwell'
            : "Paused: hospitals won't see you as a match until you turn this back on"
        }
        checked={me.available}
        onChange={change}
        disabled={setAvailability.isPending}
      />
    </Panel>
  );
}

// D5 preview: the most urgent requests the donor hasn't answered yet
function NeedsYouNow() {
  const incoming = useIncomingRequests();

  if (incoming.isPending) {
    return (
      <Panel title="Needs you now">
        <StateView state="loading" rows={3} />
      </Panel>
    );
  }
  if (incoming.isError) {
    return (
      <Panel title="Needs you now">
        <StateView state="error" title="We couldn't load requests" error={incoming.error} onRetry={() => void incoming.refetch()} />
      </Panel>
    );
  }

  const unanswered = incoming.data.filter((request) => request.myResponse === null);
  const accepted = incoming.data.filter((request) => request.myResponse === 'ACCEPTED');

  return (
    <Panel
      title={
        <span>
          Needs you now <span className="text-text-subtle">· {unanswered.length}</span>
        </span>
      }
      actions={
        incoming.data.length > 0 && (
          <LinkButton to="/donor/requests" variant="text" size="sm">
            All requests
          </LinkButton>
        )
      }
    >
      {accepted.length > 0 && (
        <p className="border-b border-border bg-success-soft px-5 py-3 text-label text-success">
          You've accepted {accepted.length} {accepted.length === 1 ? 'request' : 'requests'}.{' '}
          <Link to="/donor/requests" className="font-semibold text-success">
            See where to go
          </Link>
        </p>
      )}
      {unanswered.length === 0 ? (
        <StateView
          state="empty"
          title="Nothing needs you right now"
          description="When a hospital needs your blood group, the request appears here and we'll notify you."
        />
      ) : (
        <ul className="divide-y divide-neutral-soft">
          {unanswered.slice(0, PREVIEW).map((request) => (
            <RequestPreview key={request.requestId} request={request} />
          ))}
          {unanswered.length > PREVIEW && (
            <li className="px-5 py-3 text-label text-text-muted">
              And {unanswered.length - PREVIEW} more.{' '}
              <Link to="/donor/requests" className="font-semibold">
                See all
              </Link>
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}

function RequestPreview({ request }: { request: IncomingRequest }) {
  return (
    <li>
      <Link
        to={`/donor/requests#${request.reference}`}
        className="flex items-center gap-4 px-5 py-4 text-ink no-underline hover:bg-bg focus-visible:shadow-focus focus-visible:outline-none"
      >
        <BloodGroupBadge group={request.bloodGroup} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {request.hospitalName}
            <UrgencyTag urgency={request.urgency} />
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} aria-hidden="true" />
              {request.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={13} aria-hidden="true" />
              By {formatInstant(request.neededBy, true)}
            </span>
            <span>
              {request.unitsNeeded} {request.unitsNeeded === 1 ? 'unit' : 'units'} of {formatBloodGroup(request.bloodGroup)}
            </span>
          </p>
        </div>
        <ArrowRight size={18} className="shrink-0 text-text-subtle" aria-hidden="true" />
      </Link>
    </li>
  );
}
