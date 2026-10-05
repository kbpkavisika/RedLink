import { MessageSquare, Phone } from 'lucide-react';
import { Badge, BloodGroupBadge, Panel, StateView, Table, type BadgeTone, type Column } from '../../components/ui';
import { useResponses } from '../../hooks/useRequests';
import { formatInstant } from '../../lib/format';
import type { BloodRequestDetail, RequestResponse, ResponseStatus } from '../../types';

const STATUS: Record<ResponseStatus, { label: string; tone: BadgeTone }> = {
  ACCEPTED: { label: 'Coming', tone: 'success' },
  WITHDRAWN: { label: "Can't make it", tone: 'warning' },
  DECLINED: { label: 'Declined', tone: 'neutral' },
};

const columns: Column<RequestResponse>[] = [
  {
    key: 'donor',
    header: 'Donor',
    cell: (response) => (
      <div className="flex items-center gap-3">
        <BloodGroupBadge group={response.bloodGroup} />
        <div className="min-w-0">
          <p className="truncate font-medium">{response.name}</p>
          <p className="text-caption text-text-subtle">{response.city}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Reply',
    cell: (response) => <Badge tone={STATUS[response.status].tone}>{STATUS[response.status].label}</Badge>,
  },
  {
    key: 'when',
    header: 'When',
    cell: (response) => (
      <span className="whitespace-nowrap text-text-muted">
        {formatInstant(response.status === 'WITHDRAWN' ? response.updatedAt : response.respondedAt, true)}
      </span>
    ),
  },
  {
    key: 'phone',
    header: 'Phone',
    align: 'right',
    // Only donors who are coming need a call; the others have said no
    cell: (response) =>
      response.status === 'ACCEPTED' && response.phone ? (
        <a
          href={`tel:${response.phone}`}
          className="inline-flex items-center gap-1.5 whitespace-nowrap no-underline"
          aria-label={`Call ${response.name}, ${response.phone}`}
        >
          <Phone size={14} aria-hidden="true" />
          {response.phone}
        </a>
      ) : (
        <span className="text-text-subtle">—</span>
      ),
  },
];

/**
 * H7 on the request page: who is coming, who can't make it after all, and who declined.
 * Checks for new replies every 30 seconds while the page is open.
 */
export function ResponsesPanel({ request, notifiedCount }: { request: BloodRequestDetail; notifiedCount: number }) {
  const { data: responses, isPending, isError, error, refetch } = useResponses(request.id);

  const count = (status: ResponseStatus) => responses?.filter((response) => response.status === status).length ?? 0;
  const coming = count('ACCEPTED');

  return (
    <Panel
      title="Donor replies"
      actions={
        responses &&
        responses.length > 0 && (
          <span className="text-label text-text-subtle">
            <strong className="text-ink">{coming} coming</strong> for {request.unitsNeeded}{' '}
            {request.unitsNeeded === 1 ? 'unit' : 'units'} · {count('WITHDRAWN')} withdrew · {count('DECLINED')} declined
          </span>
        )
      }
    >
      {isPending ? (
        <StateView state="loading" rows={2} />
      ) : isError ? (
        <StateView state="error" title="We couldn't load replies" error={error} onRetry={() => void refetch()} />
      ) : responses.length === 0 ? (
        <StateView
          state="empty"
          icon={MessageSquare}
          title="No replies yet"
          description={
            notifiedCount > 0
              ? `${notifiedCount} ${notifiedCount === 1 ? 'donor was' : 'donors were'} notified. Replies appear here as they come in; you can also call the matches below.`
              : 'Replies appear here as donors answer. You can also call the matches below.'
          }
        />
      ) : (
        <Table
          caption={`Donor replies to #${request.reference}`}
          rows={responses}
          rowKey={(response) => response.donorId}
          columns={columns}
        />
      )}
    </Panel>
  );
}
