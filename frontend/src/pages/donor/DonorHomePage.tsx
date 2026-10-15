import { ArrowRight, CalendarClock, MapPin, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
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

function greetingKey(now = new Date()) {
  const hour = now.getHours();
  return hour < 12 ? 'greetingMorning' : hour < 17 ? 'greetingAfternoon' : 'greetingEvening';
}

/**
 * /donor (D3, D4, D5): status cards on the left (eligibility, availability), requests that need the donor
 * on the right (design.md §7). Replying to requests happens on /donor/requests.
 */
export function DonorHomePage() {
  const { t } = useTranslation();
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
          title={t('donor.home.loadError')}
          error={profile.error}
          action={
            <Button
              loading={profile.isRefetching}
              onClick={() => void profile.refetch()}
              leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}
            >
              {t('common.tryAgain')}
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
          <p className="text-label text-text-muted">{t(`donor.home.${greetingKey()}`)}</p>
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
  const { t } = useTranslation();
  const lastDonation =
    me.lastDonationDate === null
      ? t('donor.home.neverDonated')
      : t('donor.home.lastDonation', { date: formatDate(me.lastDonationDate), count: me.daysSinceLastDonation ?? 0 });

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
            {me.eligible
              ? t('donor.home.canDonate')
              : t('donor.home.canDonateAgainOn', { date: formatDate(me.nextEligibleDate as string) })}
          </p>
          <p className="text-label text-text-muted">{lastDonation}</p>
        </div>
      </div>
      {!me.eligible && (
        <p className="mt-4 rounded-xl border border-dashed border-border-strong px-4 py-3.5 text-label text-text-muted">
          <Trans
            i18nKey="donor.home.waitNote"
            values={{ days: me.daysBetweenDonations, date: formatDate(me.nextEligibleDate as string) }}
            components={{ b: <strong className="text-ink" /> }}
          />
        </p>
      )}
    </Panel>
  );
}

// D3: pausing alerts while travelling or unwell
function AvailabilityCard({ me }: { me: DonorProfile }) {
  const { t } = useTranslation();
  const setAvailability = useSetAvailability();

  const change = (available: boolean) =>
    setAvailability.mutate(available, {
      onSuccess: () => toast.success(available ? t('donor.home.availableAgain') : t('donor.home.paused')),
      onError: (error) => toast.error(error.message),
    });

  return (
    <Panel padded>
      <Switch
        label={t('donor.home.available')}
        description={me.available ? t('donor.home.availableHint') : t('donor.home.pausedHint')}
        checked={me.available}
        onChange={change}
        disabled={setAvailability.isPending}
      />
    </Panel>
  );
}

// D5 preview: the most urgent requests the donor hasn't answered yet
function NeedsYouNow() {
  const { t } = useTranslation();
  const incoming = useIncomingRequests();

  if (incoming.isPending) {
    return (
      <Panel title={t('donor.home.needsYouNow')}>
        <StateView state="loading" rows={3} />
      </Panel>
    );
  }
  if (incoming.isError) {
    return (
      <Panel title={t('donor.home.needsYouNow')}>
        <StateView
          state="error"
          title={t('donor.home.requestsLoadError')}
          error={incoming.error}
          onRetry={() => void incoming.refetch()}
        />
      </Panel>
    );
  }

  const unanswered = incoming.data.filter((request) => request.myResponse === null);
  const accepted = incoming.data.filter((request) => request.myResponse === 'ACCEPTED');

  return (
    <Panel
      title={
        <span>
          {t('donor.home.needsYouNow')} <span className="text-text-subtle">· {unanswered.length}</span>
        </span>
      }
      actions={
        incoming.data.length > 0 && (
          <LinkButton to="/donor/requests" variant="text" size="sm">
            {t('donor.home.allRequests')}
          </LinkButton>
        )
      }
    >
      {accepted.length > 0 && (
        <p className="border-b border-border bg-success-soft px-5 py-3 text-label text-success">
          {t('donor.home.accepted', { count: accepted.length })}{' '}
          <Link to="/donor/requests" className="font-semibold text-success">
            {t('donor.home.seeWhereToGo')}
          </Link>
        </p>
      )}
      {unanswered.length === 0 ? (
        <StateView
          state="empty"
          title={t('donor.home.nothingNeedsYou')}
          description={t('donor.home.nothingNeedsYouBody')}
        />
      ) : (
        <ul className="divide-y divide-neutral-soft">
          {unanswered.slice(0, PREVIEW).map((request) => (
            <RequestPreview key={request.requestId} request={request} />
          ))}
          {unanswered.length > PREVIEW && (
            <li className="px-5 py-3 text-label text-text-muted">
              {t('donor.home.andMore', { count: unanswered.length - PREVIEW })}{' '}
              <Link to="/donor/requests" className="font-semibold">
                {t('common.seeAll')}
              </Link>
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}

function RequestPreview({ request }: { request: IncomingRequest }) {
  const { t } = useTranslation();
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
              {t('donor.home.by', { date: formatInstant(request.neededBy, true) })}
            </span>
            <span>
              {t('common.unitsOf', { count: request.unitsNeeded, group: formatBloodGroup(request.bloodGroup) })}
            </span>
          </p>
        </div>
        <ArrowRight size={18} className="shrink-0 text-text-subtle" aria-hidden="true" />
      </Link>
    </li>
  );
}
