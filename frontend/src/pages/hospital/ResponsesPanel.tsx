import { MessageSquare, Phone } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Badge,
  BloodGroupBadge,
  Button,
  FilterBar,
  FilterSelect,
  Panel,
  SearchInput,
  StateView,
  Table,
  type BadgeTone,
  type Column,
} from '../../components/ui';
import { useResponses } from '../../hooks/useRequests';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { formatInstant } from '../../lib/format';
import { matchesQuery } from '../../lib/search';
import type { BloodRequestDetail, RequestResponse, ResponseStatus } from '../../types';

const REPLY_FILTERS = ['rq', 'reply'] as const;

// How each reply looks; after the request is fulfilled, "Coming" becomes what actually happened.
// The words are translated: t(`status.reply.${badge}`)
type ReplyBadge = ResponseStatus | 'DONATED' | 'DIDNT_DONATE';
const TONES: Record<ReplyBadge, BadgeTone> = {
  ACCEPTED: 'success',
  WITHDRAWN: 'warning',
  DECLINED: 'neutral',
  DONATED: 'success',
  DIDNT_DONATE: 'neutral',
};
const STATUSES: ResponseStatus[] = ['ACCEPTED', 'WITHDRAWN', 'DECLINED'];

type Row = RequestResponse & { badge: ReplyBadge };

/**
 * H7 on the request page: who is coming, who can't make it after all, and who declined.
 * Checks for new replies every 30 seconds while the page is open.
 */
interface ResponsesPanelProps {
  request: BloodRequestDetail;
  notifiedCount: number;
  // Donors recorded as having given blood (once the request is FULFILLED)
  donatedDonorIds: number[];
}

export function ResponsesPanel({ request, notifiedCount, donatedDonorIds }: ResponsesPanelProps) {
  const { t } = useTranslation();
  const { data: responses, isPending, isError, error, refetch } = useResponses(request.id);
  // Own URL keys, so they don't clash with the match list's search on the same page
  const filters = useUrlFilters(REPLY_FILTERS);
  const { rq, reply } = filters.values;
  const fulfilled = request.status === 'FULFILLED';

  const count = (status: ResponseStatus) => responses?.filter((response) => response.status === status).length ?? 0;
  const coming = count('ACCEPTED');
  const rows: Row[] = (responses ?? [])
    .filter(
      (response) => (!reply || response.status === reply) && matchesQuery(rq, response.name, response.phone, response.city),
    )
    .map((response) => ({
      ...response,
      badge:
        fulfilled && response.status === 'ACCEPTED'
          ? donatedDonorIds.includes(response.donorId)
            ? 'DONATED'
            : 'DIDNT_DONATE'
          : response.status,
    }));

  const columns: Column<Row>[] = [
    {
      key: 'donor',
      header: t('common.donor'),
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
      header: t('hospital.responses.reply'),
      cell: (response) => <Badge tone={TONES[response.badge]}>{t(`status.reply.${response.badge}`)}</Badge>,
    },
    {
      key: 'when',
      header: t('hospital.responses.when'),
      cell: (response) => (
        <span className="whitespace-nowrap text-text-muted">
          {formatInstant(response.status === 'WITHDRAWN' ? response.updatedAt : response.respondedAt, true)}
        </span>
      ),
    },
    {
      key: 'phone',
      header: t('common.phone'),
      align: 'right',
      // Only donors who are coming need a call; the others have said no
      cell: (response) =>
        response.status === 'ACCEPTED' && response.phone ? (
          <a
            href={`tel:${response.phone}`}
            className="inline-flex items-center gap-1.5 whitespace-nowrap no-underline"
            aria-label={t('common.callLabel', { name: response.name, phone: response.phone })}
          >
            <Phone size={14} aria-hidden="true" />
            {response.phone}
          </a>
        ) : (
          <span className="text-text-subtle">—</span>
        ),
    },
  ];

  return (
    <Panel
      title={t('hospital.responses.title')}
      actions={
        responses &&
        responses.length > 0 && (
          <span className="text-label text-text-subtle">
            <Trans
              i18nKey={fulfilled ? 'hospital.responses.summaryDonated' : 'hospital.responses.summaryComing'}
              values={{
                count: fulfilled ? donatedDonorIds.length : coming,
                units: t('common.unit', { count: request.unitsNeeded }),
                withdrew: count('WITHDRAWN'),
                declined: count('DECLINED'),
              }}
              components={{ b: <strong className="text-ink" /> }}
            />
          </span>
        )
      }
    >
      {responses && responses.length > 0 && (
        <FilterBar shown={rows.length} total={responses.length} active={filters.active} onClear={filters.clear}>
          <SearchInput
            label={t('hospital.responses.search')}
            placeholder={t('common.namePhonePlaceholder')}
            value={rq}
            onChange={(value) => filters.set('rq', value)}
          />
          <FilterSelect
            label={t('hospital.responses.reply')}
            allLabel={t('hospital.responses.allReplies')}
            value={reply}
            onChange={(value) => filters.set('reply', value)}
            options={STATUSES.map((status) => ({ value: status, label: t(`status.reply.${status}`) }))}
          />
        </FilterBar>
      )}
      {isPending ? (
        <StateView state="loading" rows={2} />
      ) : isError ? (
        <StateView state="error" title={t('hospital.responses.loadError')} error={error} onRetry={() => void refetch()} />
      ) : responses.length > 0 && rows.length === 0 ? (
        <StateView
          state="no-results"
          title={
            reply
              ? t('hospital.responses.noStatusMatch', { status: t(`status.reply.${reply as ResponseStatus}`) })
              : t('hospital.responses.noMatch')
          }
          description={t('hospital.responses.noMatchBody')}
          action={
            <Button variant="outline" onClick={filters.clear}>
              {t('common.clearFilters')}
            </Button>
          }
        />
      ) : responses.length === 0 ? (
        <StateView
          state="empty"
          icon={MessageSquare}
          title={t('hospital.responses.emptyTitle')}
          description={
            notifiedCount > 0
              ? t('hospital.responses.emptyNotified', { count: notifiedCount })
              : t('hospital.responses.emptyBody')
          }
        />
      ) : (
        <Table
          caption={t('hospital.responses.caption', { ref: request.reference })}
          rows={rows}
          rowKey={(response) => response.donorId}
          columns={columns}
        />
      )}
    </Panel>
  );
}
