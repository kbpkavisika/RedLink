import { Building2, Check, RefreshCw, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import { Badge, Button, FormAlert, HospitalStatusBadge, Panel, StateView, Textarea } from '../../components/ui';
import { useDecideHospital, useHospital } from '../../hooks/useAdminHospitals';
import { formatInstant } from '../../lib/format';
import { msg } from '../../lib/messages';
import type { HospitalDetail } from '../../types';

const MAX_REASON = 500;

interface HospitalReviewPanelProps {
  hospitalId: number | null;
  onClose: () => void;
}

/**
 * The right-hand panel on /admin/hospitals: everything needed to check a hospital is real (A2),
 * and, while it's PENDING, approve (A3) or reject it with a reason (A4).
 */
export function HospitalReviewPanel({ hospitalId, onClose }: HospitalReviewPanelProps) {
  const { t } = useTranslation();
  const { data: hospital, isPending, isError, error, refetch, isRefetching } = useHospital(hospitalId);

  if (hospitalId === null) {
    return (
      <Panel>
        <StateView
          state="empty"
          icon={Building2}
          title={t('admin.review.selectTitle')}
          description={t('admin.review.selectBody')}
        />
      </Panel>
    );
  }

  return (
    <Panel
      title={hospital?.name ?? t('common.hospital')}
      actions={
        <>
          {hospital && <HospitalStatusBadge status={hospital.status} />}
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
          title={error.status === 404 ? t('admin.review.gone') : t('admin.review.loadError')}
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
          <HospitalFacts hospital={hospital} />
          <StaffList hospital={hospital} />
          {hospital.status === 'PENDING' ? (
            // Keyed by id so switching hospitals starts with a fresh, empty form
            <DecisionForm key={hospital.id} hospital={hospital} />
          ) : (
            <DecisionRecord hospital={hospital} />
          )}
        </div>
      )}
    </Panel>
  );
}

function HospitalFacts({ hospital }: { hospital: HospitalDetail }) {
  const { t } = useTranslation();
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-body">
      <Fact term={t('admin.review.registrationNo')}>
        <span className="font-mono">{hospital.registrationNo}</span>
      </Fact>
      <Fact term={t('admin.review.address')}>{hospital.address}</Fact>
      <Fact term={t('common.city')}>{hospital.city}</Fact>
      <Fact term={t('common.phone')}>
        <a href={`tel:${hospital.phone}`}>{hospital.phone}</a>
      </Fact>
      <Fact term={t('common.registered')}>{formatInstant(hospital.createdAt, true)}</Fact>
    </dl>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-label text-text-subtle">{term}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </>
  );
}

function StaffList({ hospital }: { hospital: HospitalDetail }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-eyebrow text-primary uppercase">{t('admin.review.staff')}</h3>
      {hospital.staff.length === 0 ? (
        <p className="text-body text-text-muted">{t('admin.review.noStaff')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-soft rounded-xl border border-border">
          {hospital.staff.map((member, index) => (
            <li key={member.id} className="flex flex-col gap-0.5 px-4 py-3">
              <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                {member.fullName}
                {index === 0 && <Badge tone="info">{t('admin.review.registeredIt')}</Badge>}
                {!member.enabled && <Badge>{t('admin.review.disabled')}</Badge>}
              </p>
              <p className="flex flex-wrap gap-x-3 text-label text-text-muted">
                <a href={`mailto:${member.email}`}>{member.email}</a>
                {member.phone && <a href={`tel:${member.phone}`}>{member.phone}</a>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Who decided, when and why: shown once a hospital is APPROVED or REJECTED (decisions are final)
function DecisionRecord({ hospital }: { hospital: HospitalDetail }) {
  const { t } = useTranslation();
  const when = hospital.reviewedAt ? formatInstant(hospital.reviewedAt, true) : null;
  const who = hospital.reviewedBy ?? t('admin.review.anAdmin');
  const approved = hospital.status === 'APPROVED';
  const key = approved
    ? when
      ? 'admin.review.approvedByOn'
      : 'admin.review.approvedBy'
    : when
      ? 'admin.review.rejectedByOn'
      : 'admin.review.rejectedBy';

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border-strong px-4 py-3 text-label text-text-muted">
      <p>
        <Trans i18nKey={key} values={{ who, when }} components={{ b: <strong className="text-ink" /> }} />
      </p>
      {hospital.rejectionReason && (
        <p>
          <span className="font-semibold text-ink">{t('admin.review.reasonShown')}</span> {hospital.rejectionReason}
        </p>
      )}
    </div>
  );
}

type Mode = 'choose' | 'approve' | 'reject';

function DecisionForm({ hospital }: { hospital: HospitalDetail }) {
  const { t } = useTranslation();
  const decide = useDecideHospital(hospital.id);
  const [mode, setMode] = useState<Mode>('choose');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();

  const cancel = () => {
    setMode('choose');
    setReasonError(undefined);
    decide.reset();
  };

  const approve = () => {
    decide.mutate(
      { status: 'APPROVED' },
      { onSuccess: () => toast.success(t('admin.review.approvedToast', { name: hospital.name })) },
    );
  };

  const reject = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError(msg('reasonRequired'));
      return;
    }
    setReasonError(undefined);
    decide.mutate(
      { status: 'REJECTED', reason: trimmed },
      { onSuccess: () => toast.success(t('admin.review.rejectedToast', { name: hospital.name })) },
    );
  };

  const serverReasonError = decide.error?.fieldErrors.find((field) => field.field === 'reason')?.message;

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-bg p-4">
      <h3 className="text-eyebrow text-primary uppercase">{t('admin.review.decision')}</h3>
      <FormAlert>{decide.error && !serverReasonError ? decide.error.message : null}</FormAlert>

      {mode === 'choose' && (
        <>
          <p className="text-body text-text-muted">{t('admin.review.checkIntro')}</p>
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<Check size={16} aria-hidden="true" />} onClick={() => setMode('approve')}>
              {t('admin.review.approve')}
            </Button>
            <Button variant="outline" onClick={() => setMode('reject')}>
              {t('admin.review.reject')}
            </Button>
          </div>
        </>
      )}

      {mode === 'approve' && (
        <>
          <p className="text-body text-ink">
            <Trans i18nKey="admin.review.approveConfirm" values={{ name: hospital.name }} components={{ b: <strong /> }} />
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={cancel} disabled={decide.isPending}>
              {t('common.cancel')}
            </Button>
            <Button loading={decide.isPending} onClick={approve}>
              {t('admin.review.confirmApproval')}
            </Button>
          </div>
        </>
      )}

      {mode === 'reject' && (
        <>
          <Textarea
            label={t('admin.review.reasonLabel')}
            autoFocus
            maxLength={MAX_REASON}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            hint={t('admin.review.reasonHint', { length: reason.length, max: MAX_REASON })}
            error={reasonError ?? (serverReasonError && t('admin.review.serverReason', { message: serverReasonError }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={cancel} disabled={decide.isPending}>
              {t('common.cancel')}
            </Button>
            <Button loading={decide.isPending} onClick={reject}>
              {t('admin.review.rejectHospital')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
