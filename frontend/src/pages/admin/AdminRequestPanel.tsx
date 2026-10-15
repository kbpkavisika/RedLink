import { ClipboardList, Phone, RefreshCw, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { data, isPending, isError, error, refetch, isRefetching } = useAdminRequest(requestId);

  if (requestId === null) {
    return (
      <Panel>
        <StateView
          state="empty"
          icon={ClipboardList}
          title={t('admin.requestPanel.selectTitle')}
          description={t('admin.requestPanel.selectBody')}
        />
      </Panel>
    );
  }

  return (
    <Panel
      title={data ? `#${data.request.reference}` : t('common.request')}
      actions={
        <>
          {data && <RequestStatusBadge status={data.request.status} />}
          <Button variant="icon" size="sm" aria-label={t('common.closeDetails')} onClick={onClose}>
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
          title={error.status === 404 ? t('admin.requestPanel.gone') : t('hospital.detail.loadError')}
          error={error}
          action={
            error.status !== 404 && (
              <Button
                loading={isRefetching}
                onClick={() => void refetch()}
                leftIcon={<RefreshCw size={16} className="stroke-2" aria-hidden="true" />}
              >
                {t('common.tryAgain')}
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
  const { t } = useTranslation();
  const { request } = detail;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <BloodGroupBadge group={request.bloodGroup} />
        <span className="font-medium text-ink">
          {t('common.unitsOf', { count: request.unitsNeeded, group: formatBloodGroup(request.bloodGroup) })}
        </span>
        <UrgencyTag urgency={request.urgency} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Fact label={t('common.hospital')}>{request.hospitalName}</Fact>
        <Fact label={t('auth.registerHospital.hospitalPhone')}>
          <a href={`tel:${detail.hospitalPhone}`} className="inline-flex items-center gap-1.5 no-underline">
            <Phone size={14} aria-hidden="true" />
            {detail.hospitalPhone}
          </a>
        </Fact>
        <Fact label={t('common.city')}>{request.city}</Fact>
        <Fact label={t('common.neededBy')}>{formatInstant(request.neededBy, true)}</Fact>
        <Fact label={t('common.posted')}>
          {t('admin.requestPanel.postedBy', { date: formatInstant(request.createdAt, true), name: request.createdBy })}
        </Fact>
        <Fact label={t('hospital.detail.notifiedWhenPosted')}>
          {t('common.donorCount', { count: detail.notifiedCount })}
        </Fact>
        {request.closedAt && (
          <Fact label={t('admin.requestPanel.closed')}>{formatInstant(request.closedAt, true)}</Fact>
        )}
        {request.status === 'FULFILLED' && (
          <Fact label={t('hospital.detail.donated')}>
            {t('common.donorCount', { count: detail.donatedDonorIds.length })}
          </Fact>
        )}
      </dl>
    </div>
  );
}

type ReplyBadge = 'ACCEPTED' | 'WITHDRAWN' | 'DECLINED' | 'DONATED' | 'DIDNT_DONATE';

function replyBadge(response: RequestResponse, detail: AdminRequestDetail): { badge: ReplyBadge; tone: BadgeTone } {
  if (response.status === 'ACCEPTED') {
    if (detail.request.status === 'FULFILLED') {
      return detail.donatedDonorIds.includes(response.donorId)
        ? { badge: 'DONATED', tone: 'success' }
        : { badge: 'DIDNT_DONATE', tone: 'neutral' };
    }
    return { badge: 'ACCEPTED', tone: 'success' };
  }
  return response.status === 'WITHDRAWN'
    ? { badge: 'WITHDRAWN', tone: 'warning' }
    : { badge: 'DECLINED', tone: 'neutral' };
}

function Replies({ detail }: { detail: AdminRequestDetail }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-label font-semibold text-ink">
        {t('common.replies')} <span className="font-normal text-text-subtle">· {detail.responses.length}</span>
      </h3>
      {detail.responses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-3 text-label text-text-muted">
          {t('admin.requestPanel.noReplies')}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-soft rounded-xl border border-border">
          {detail.responses.map((response) => {
            const { badge, tone } = replyBadge(response, detail);
            return (
              <li key={response.donorId} className="flex items-center gap-3 px-4 py-3">
                <BloodGroupBadge group={response.bloodGroup} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{response.name}</span>
                  <span className="block text-caption text-text-subtle">
                    {response.city} · {formatInstant(response.respondedAt, true)}
                  </span>
                </span>
                <Badge tone={tone}>{t(`status.reply.${badge}`)}</Badge>
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
