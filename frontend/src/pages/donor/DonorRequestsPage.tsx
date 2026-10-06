import clsx from 'clsx';
import { CalendarClock, Check, HeartHandshake, MapPin, Navigation, Phone, RefreshCw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Link, useLocation } from 'react-router-dom';
import { Badge, BloodGroupBadge, Button, Panel, StateView, UrgencyTag } from '../../components/ui';
import { useIncomingRequests, useMyProfile, useRespond, useWithdraw } from '../../hooks/useDonorSelf';
import { formatBloodGroup, formatDate, formatInstant } from '../../lib/format';
import type { DonorProfile, IncomingRequest } from '../../types';

/**
 * /donor/requests (D5–D9). Three groups, in the order a donor needs them:
 *   1. accepted: where to go and when (D8), with "I can't make it anymore" (D9)
 *   2. waiting for a reply: I can donate (D6) / Decline (D7), critical ones highlighted
 *   3. answered: declined or withdrawn, which are final
 * Each card has the request reference as its id, so /donor/requests#RQ-12 scrolls to it.
 */
export function DonorRequestsPage() {
  const incoming = useIncomingRequests();
  const profile = useMyProfile();
  useScrollToHash(incoming.isSuccess);

  if (incoming.isPending || profile.isPending) {
    return (
      <Panel>
        <StateView state="loading" rows={4} />
      </Panel>
    );
  }
  if (incoming.isError || profile.isError) {
    const failed = incoming.isError ? incoming : profile;
    return (
      <Panel>
        <StateView
          state="error"
          title="We couldn't load your requests"
          error={failed.error ?? undefined}
          action={
            <Button
              loading={failed.isRefetching}
              onClick={() => void failed.refetch()}
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
  const accepted = incoming.data.filter((request) => request.myResponse === 'ACCEPTED');
  const waiting = incoming.data.filter((request) => request.myResponse === null);
  const answered = incoming.data.filter(
    (request) => request.myResponse === 'DECLINED' || request.myResponse === 'WITHDRAWN',
  );

  if (incoming.data.length === 0) {
    return (
      <Panel>
        <StateView
          state="empty"
          icon={HeartHandshake}
          title="No requests right now"
          description={`When a hospital needs blood you can give (${formatBloodGroup(me.bloodGroup)}), the request appears here and we'll notify you.`}
        />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!me.available && (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-3 text-label text-text-muted">
          Your alerts are paused, so hospitals don't see you as a match. You can still reply here.{' '}
          <Link to="/donor">Turn them back on</Link>
        </p>
      )}

      {accepted.map((request) => (
        <AcceptedBanner key={request.requestId} request={request} me={me} />
      ))}

      <section className="flex flex-col gap-4" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="text-eyebrow text-primary uppercase">
          Needs you now · {waiting.length}
        </h2>
        {waiting.length === 0 ? (
          <Panel>
            <StateView
              state="empty"
              title="You've answered every request"
              description="New requests for your blood group appear here as hospitals post them."
            />
          </Panel>
        ) : (
          waiting.map((request) => <RequestCard key={request.requestId} request={request} me={me} />)
        )}
      </section>

      {answered.length > 0 && (
        <Panel title="Answered">
          <ul className="divide-y divide-neutral-soft">
            {answered.map((request) => (
              <li key={request.requestId} id={request.reference} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <BloodGroupBadge group={request.bloodGroup} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{request.hospitalName}</p>
                  <p className="text-caption text-text-subtle">
                    #{request.reference} · {request.city}
                  </p>
                </div>
                <Badge>{request.myResponse === 'DECLINED' ? 'You declined' : 'You withdrew'}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

// /donor/requests#RQ-12 from the home page: the list loads after the page, so scroll once it has
function useScrollToHash(ready: boolean) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || !hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [ready, hash]);
}

function units(request: IncomingRequest) {
  return `${request.unitsNeeded} ${request.unitsNeeded === 1 ? 'unit' : 'units'} of ${formatBloodGroup(request.bloodGroup)}`;
}

function directionsUrl(request: IncomingRequest) {
  const place = `${request.hospitalName}, ${request.hospitalAddress}, ${request.city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

// D5–D7: one request waiting for a reply
function RequestCard({ request, me }: { request: IncomingRequest; me: DonorProfile }) {
  const respond = useRespond();
  const [confirmDecline, setConfirmDecline] = useState(false);
  const critical = request.urgency === 'CRITICAL';

  const reply = (status: 'ACCEPTED' | 'DECLINED') =>
    respond.mutate(
      { requestId: request.requestId, status },
      {
        onSuccess: () =>
          toast.success(status === 'ACCEPTED' ? 'Thank you! The hospital can see you are coming.' : 'Request declined.'),
        onError: (error) => toast.error(error.message),
      },
    );

  return (
    <article
      id={request.reference}
      aria-labelledby={`${request.reference}-title`}
      className={clsx(
        'scroll-mt-24 overflow-hidden rounded-2xl border bg-surface',
        critical ? 'border-primary shadow-urgent' : 'border-border',
      )}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start gap-3">
          <BloodGroupBadge group={request.bloodGroup} size="md" />
          <div className="min-w-0 flex-1">
            <h3 id={`${request.reference}-title`} className="flex flex-wrap items-center gap-2 text-title-md text-ink">
              {request.hospitalName}
              <UrgencyTag urgency={request.urgency} />
            </h3>
            <p className="text-caption text-text-subtle">
              #{request.reference} · needs {units(request)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {request.exactMatch ? <Badge tone="success">Your group</Badge> : <Badge>You can give</Badge>}
            {request.sameCity && <Badge tone="info">Your city</Badge>}
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <Detail icon={<CalendarClock size={16} aria-hidden="true" />} label="Needed by">
            {formatInstant(request.neededBy, true)}
          </Detail>
          <Detail icon={<MapPin size={16} aria-hidden="true" />} label="Where">
            {request.hospitalAddress}, {request.city}
          </Detail>
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-sunken px-5 py-3">
        {!me.eligible && (
          <p className="mr-auto text-caption text-text-muted">
            You can accept requests from {formatDate(me.nextEligibleDate as string)}.
          </p>
        )}
        {confirmDecline ? (
          <>
            <p className="mr-auto text-label text-ink">Decline? You can't change this later.</p>
            <Button variant="text" size="sm" onClick={() => setConfirmDecline(false)} disabled={respond.isPending}>
              Keep
            </Button>
            <Button variant="outline" size="sm" loading={respond.isPending} onClick={() => reply('DECLINED')}>
              Yes, decline
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setConfirmDecline(true)} disabled={respond.isPending}>
              Decline
            </Button>
            <Button
              loading={respond.isPending}
              disabled={!me.eligible}
              onClick={() => reply('ACCEPTED')}
              leftIcon={<Check size={16} className="stroke-2" aria-hidden="true" />}
            >
              I can donate
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 text-text-subtle">{icon}</span>
      <div>
        <dt className="text-caption text-text-subtle">{label}</dt>
        <dd className="text-body text-ink">{children}</dd>
      </div>
    </div>
  );
}

// D8, D9: where to go and when, with "I can't make it anymore"
function AcceptedBanner({ request, me }: { request: IncomingRequest; me: DonorProfile }) {
  const withdraw = useWithdraw();
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const firstName = me.fullName.split(' ')[0];

  const cantMakeIt = () =>
    withdraw.mutate(request.requestId, {
      onSuccess: () => toast.success("Thanks for letting them know. The hospital can see you can't make it."),
      onError: (error) => toast.error(error.message),
    });

  return (
    <section
      id={request.reference}
      aria-labelledby={`${request.reference}-accepted`}
      className="scroll-mt-24 flex flex-col gap-4 rounded-2xl bg-success p-6 text-white"
    >
      <div className="flex items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/18">
          <Check size={20} className="stroke-[2.5]" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id={`${request.reference}-accepted`} className="font-display text-display-sm">
            Thank you, {firstName}. {request.hospitalName} is expecting you.
          </h2>
          <p className="text-body text-on-success-muted">
            Please arrive before {formatInstant(request.neededBy, true)} and bring your NIC. They need{' '}
            {units(request)} for request #{request.reference}.
          </p>
          <p className="text-label text-on-success-muted">
            {request.hospitalAddress}, {request.city}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-14">
        <a
          href={directionsUrl(request)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-label font-semibold text-white no-underline hover:bg-ink-2 focus-visible:shadow-focus focus-visible:outline-none"
        >
          <Navigation size={16} aria-hidden="true" />
          Directions
        </a>
        <a
          href={`tel:${request.hospitalPhone}`}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/60 px-4 text-label font-semibold text-white no-underline hover:bg-white/10 focus-visible:shadow-focus focus-visible:outline-none"
        >
          <Phone size={16} aria-hidden="true" />
          Call blood bank
        </a>

        {confirmWithdraw ? (
          <span className="flex flex-wrap items-center gap-2 text-label">
            Tell the hospital you can't come?
            <button
              type="button"
              className="hit-target relative font-semibold underline disabled:opacity-60"
              disabled={withdraw.isPending}
              onClick={cantMakeIt}
            >
              {withdraw.isPending ? 'Sending…' : "Yes, I can't make it"}
            </button>
            <button type="button" className="hit-target relative text-on-success-muted underline" onClick={() => setConfirmWithdraw(false)}>
              Keep my place
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="hit-target relative ml-auto text-label font-semibold text-white underline underline-offset-2"
            onClick={() => setConfirmWithdraw(true)}
          >
            I can't make it anymore
          </button>
        )}
      </div>
    </section>
  );
}
