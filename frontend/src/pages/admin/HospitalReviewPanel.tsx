import { Building2, Check, RefreshCw, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, FormAlert, HospitalStatusBadge, Panel, StateView, Textarea } from '../../components/ui';
import { useDecideHospital, useHospital } from '../../hooks/useAdminHospitals';
import { formatInstant } from '../../lib/format';
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
  const { data: hospital, isPending, isError, error, refetch, isRefetching } = useHospital(hospitalId);

  if (hospitalId === null) {
    return (
      <Panel>
        <StateView
          state="empty"
          icon={Building2}
          title="Select a hospital"
          description="Choose a hospital from the list to check its details and approve or reject it."
        />
      </Panel>
    );
  }

  return (
    <Panel
      title={hospital?.name ?? 'Hospital'}
      actions={
        <>
          {hospital && <HospitalStatusBadge status={hospital.status} />}
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
          title={error.status === 404 ? 'This hospital no longer exists' : "We couldn't load this hospital"}
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
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-body">
      <Fact term="Registration no.">
        <span className="font-mono">{hospital.registrationNo}</span>
      </Fact>
      <Fact term="Address">{hospital.address}</Fact>
      <Fact term="City">{hospital.city}</Fact>
      <Fact term="Phone">
        <a href={`tel:${hospital.phone}`}>{hospital.phone}</a>
      </Fact>
      <Fact term="Registered">{formatInstant(hospital.createdAt, true)}</Fact>
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
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-eyebrow text-primary uppercase">Staff</h3>
      {hospital.staff.length === 0 ? (
        <p className="text-body text-text-muted">No staff accounts.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-soft rounded-xl border border-border">
          {hospital.staff.map((member, index) => (
            <li key={member.id} className="flex flex-col gap-0.5 px-4 py-3">
              <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                {member.fullName}
                {index === 0 && <Badge tone="info">Registered it</Badge>}
                {!member.enabled && <Badge>Disabled</Badge>}
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
  const when = hospital.reviewedAt ? formatInstant(hospital.reviewedAt, true) : null;
  const who = hospital.reviewedBy ?? 'an admin';
  const verb = hospital.status === 'APPROVED' ? 'Approved' : 'Rejected';

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border-strong px-4 py-3 text-label text-text-muted">
      <p>
        {verb} by <strong className="text-ink">{who}</strong>
        {when && <> on {when}</>}.
      </p>
      {hospital.rejectionReason && (
        <p>
          <span className="font-semibold text-ink">Reason shown to the staff:</span> {hospital.rejectionReason}
        </p>
      )}
    </div>
  );
}

type Mode = 'choose' | 'approve' | 'reject';

function DecisionForm({ hospital }: { hospital: HospitalDetail }) {
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
      { onSuccess: () => toast.success(`${hospital.name} approved. Its staff can post requests now.`) },
    );
  };

  const reject = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError('Give a reason. The hospital’s staff will see it.');
      return;
    }
    setReasonError(undefined);
    decide.mutate(
      { status: 'REJECTED', reason: trimmed },
      { onSuccess: () => toast.success(`${hospital.name} rejected.`) },
    );
  };

  const serverReasonError = decide.error?.fieldErrors.find((field) => field.field === 'reason')?.message;

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-bg p-4">
      <h3 className="text-eyebrow text-primary uppercase">Decision</h3>
      <FormAlert>{decide.error && !serverReasonError ? decide.error.message : null}</FormAlert>

      {mode === 'choose' && (
        <>
          <p className="text-body text-text-muted">
            Check the registration number and call the staff member if anything looks wrong. A decision can’t be
            changed later.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<Check size={16} aria-hidden="true" />} onClick={() => setMode('approve')}>
              Approve
            </Button>
            <Button variant="outline" onClick={() => setMode('reject')}>
              Reject
            </Button>
          </div>
        </>
      )}

      {mode === 'approve' && (
        <>
          <p className="text-body text-ink">
            Approve <strong>{hospital.name}</strong>? Its staff can post blood requests straight away.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={cancel} disabled={decide.isPending}>
              Cancel
            </Button>
            <Button loading={decide.isPending} onClick={approve}>
              Confirm approval
            </Button>
          </div>
        </>
      )}

      {mode === 'reject' && (
        <>
          <Textarea
            label="Reason for rejecting"
            autoFocus
            maxLength={MAX_REASON}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            hint={`Shown to the hospital’s staff. Say what was wrong and what they can do. ${reason.length}/${MAX_REASON}`}
            error={reasonError ?? (serverReasonError && `Reason ${serverReasonError}`)}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={cancel} disabled={decide.isPending}>
              Cancel
            </Button>
            <Button loading={decide.isPending} onClick={reject}>
              Reject hospital
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
