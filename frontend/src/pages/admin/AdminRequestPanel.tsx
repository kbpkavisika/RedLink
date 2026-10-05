import { ClipboardList, Phone, RefreshCw, X } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Badge,
  BloodGroupBadge,
  Button,
  Panel,
  RequestStatusBadge,
  StateView,
  UrgencyTag,
  type BadgeTone,
} from '../../components/ui';
import { useAdminRequest } from '../../hooks/useAdminRequests';
import { formatBloodGroup, formatInstant } from '../../lib/format';
import type { AdminRequestDetail, RequestResponse } from '../../types';

/**
 * The right-hand panel on /admin/requests (A8): one request, read-only, with the hospital's contact details,
 * every reply and who donated. Admins look into problems; the hospital runs its own requests.
 */
export function AdminRequestPanel({ requestId, onClose }: { requestId: number | null; onClose: () => void }) {
  const { data, isPending, isError, error, refetch, isRefetching } = useAdminRequest(requestId);

  if (requestId === null) {
    return (
      <Panel>
        <StateView
          state="empty"
          icon={ClipboardList}
          title="Select a request"
          description="Choose a request from the list to see its replies and outcome."
        />
      </Panel>
    );
  }

  return (
    <Panel
      title={data ? `#${data.request.reference}` : 'Request'}
      actions={
        <>
          {data && <RequestStatusBadge status={data.request.status} />}
          <Button variant="icon" size="sm" aria-label="Close details" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </Button>
        </>
      }
    >
      {isPending ? (
        <StateView state="loading" rows={6} />
      ) : isError ? (
        <StateView
          state="error"
          title={error.status === 404 ? 'This request no longer exists' : "We couldn't load this request"}
          error={error}
          action={
            error.status !== 404 && (
              <Button
                loading={isRefetching}
                onClick={() => void refetch()}
                leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}
              >
                Try again
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-6 p-5">
          <Summary detail={data} />
          <Replies detail={data} />
        </div>
      )}
    </Panel>
  );
}

function Summary({ detail }: { detail: AdminRequestDetail }) {
  const { request } = detail;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <BloodGroupBadge group={request.bloodGroup} />
        <span className="font-medium text-ink">
          {request.unitsNeeded} {request.unitsNeeded === 1 ? 'unit' : 'units'} of {formatBloodGroup(request.bloodGroup)}
        </span>
        <UrgencyTag urgency={request.urgency} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Fact label="Hospital">{request.hospitalName}</Fact>
        <Fact label="Hospital phone">
          <a href={`tel:${detail.hospitalPhone}`} className="inline-flex items-center gap-1.5 no-underline">
            <Phone size={14} aria-hidden="true" />
            {detail.hospitalPhone}
          </a>
        </Fact>
        <Fact label="City">{request.city}</Fact>
        <Fact label="Needed by">{formatInstant(request.neededBy, true)}</Fact>
        <Fact label="Posted">
          {formatInstant(request.createdAt, true)} by {request.createdBy}
        </Fact>
        <Fact label="Notified when posted">
          {detail.notifiedCount} {detail.notifiedCount === 1 ? 'donor' : 'donors'}
        </Fact>
        {request.closedAt && <Fact label="Closed">{formatInstant(request.closedAt, true)}</Fact>}
        {request.status === 'FULFILLED' && (
          <Fact label="Donated">
            {detail.donatedDonorIds.length} {detail.donatedDonorIds.length === 1 ? 'donor' : 'donors'}
          </Fact>
        )}
      </dl>
    </div>
  );
}

function replyBadge(response: RequestResponse, detail: AdminRequestDetail): { label: string; tone: BadgeTone } {
  if (response.status === 'ACCEPTED') {
    if (detail.request.status === 'FULFILLED') {
      return detail.donatedDonorIds.includes(response.donorId)
        ? { label: 'Donated', tone: 'success' }
        : { label: "Didn't donate", tone: 'neutral' };
    }
    return { label: 'Coming', tone: 'success' };
  }
  return response.status === 'WITHDRAWN'
    ? { label: "Can't make it", tone: 'warning' }
    : { label: 'Declined', tone: 'neutral' };
}

function Replies({ detail }: { detail: AdminRequestDetail }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-label font-semibold text-ink">
        Replies <span className="font-normal text-text-subtle">· {detail.responses.length}</span>
      </h3>
      {detail.responses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-3 text-label text-text-muted">
          No donor has replied to this request.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-soft rounded-xl border border-border">
          {detail.responses.map((response) => {
            const badge = replyBadge(response, detail);
            return (
              <li key={response.donorId} className="flex items-center gap-3 px-4 py-3">
                <BloodGroupBadge group={response.bloodGroup} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{response.name}</span>
                  <span className="block text-caption text-text-subtle">
                    {response.city} · {formatInstant(response.respondedAt, true)}
                  </span>
                </span>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-text-subtle">{label}</dt>
      <dd className="text-body text-ink">{children}</dd>
    </div>
  );
}
