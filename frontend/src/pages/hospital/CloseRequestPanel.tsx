import { CheckCircle2, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { BloodGroupBadge, Button, FormAlert, Panel, StateView } from '../../components/ui';
import { useCloseRequest, useResponses } from '../../hooks/useRequests';
import type { BloodRequestDetail } from '../../types';

export type CloseMode = 'fulfil' | 'cancel';

interface CloseRequestPanelProps {
  request: BloodRequestDetail;
  mode: CloseMode;
  onClose: () => void;
}

/**
 * H8, H9 on the request page. Both are final, so each asks once more before doing it.
 *   fulfil: tick the donors who actually gave blood (everyone who accepted, ticked to start with)
 *   cancel: confirm that nobody else should be asked
 */
export function CloseRequestPanel({ request, mode, onClose }: CloseRequestPanelProps) {
  const closeButton = (
    <Button variant="icon" size="sm" aria-label="Close" onClick={onClose}>
      <X size={18} aria-hidden="true" />
    </Button>
  );

  return (
    <Panel title={mode === 'fulfil' ? `Mark #${request.reference} fulfilled` : `Cancel #${request.reference}`} actions={closeButton}>
      {mode === 'fulfil' ? (
        <FulfilForm request={request} onDone={onClose} />
      ) : (
        <CancelForm request={request} onDone={onClose} />
      )}
    </Panel>
  );
}

function FulfilForm({ request, onDone }: { request: BloodRequestDetail; onDone: () => void }) {
  const responses = useResponses(request.id);
  const closeRequest = useCloseRequest(request.id);
  const accepted = (responses.data ?? []).filter((response) => response.status === 'ACCEPTED');
  // Everyone who accepted starts ticked; staff untick anyone who didn't turn up
  const [unticked, setUnticked] = useState<Set<number>>(new Set());
  const picked = accepted.filter((donor) => !unticked.has(donor.donorId)).map((donor) => donor.donorId);

  const toggle = (donorId: number) =>
    setUnticked((current) => {
      const next = new Set(current);
      if (next.has(donorId)) next.delete(donorId);
      else next.add(donorId);
      return next;
    });

  const submit = () =>
    closeRequest.mutate(
      { status: 'FULFILLED', donorIds: picked },
      {
        onSuccess: () => {
          toast.success(
            `#${request.reference} fulfilled. ${picked.length} ${picked.length === 1 ? 'donation' : 'donations'} recorded.`,
          );
          onDone();
        },
      },
    );

  if (responses.isPending) return <StateView state="loading" rows={2} />;
  if (responses.isError) {
    return (
      <StateView state="error" title="We couldn't load who accepted" error={responses.error} onRetry={() => void responses.refetch()} />
    );
  }
  if (accepted.length === 0) {
    return (
      <StateView
        state="blocked"
        title="Nobody has accepted yet"
        description="Only donors who accepted this request can be recorded as donating. If you got the blood elsewhere, cancel the request instead."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <p className="text-body text-text-muted">
        Tick everyone who gave blood. Each gets a donation in their history, and can't be asked again for 90 days.
      </p>
      <FormAlert>{closeRequest.error?.message ?? null}</FormAlert>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Donors who gave blood</legend>
        {accepted.map((donor) => {
          const checked = !unticked.has(donor.donorId);
          return (
            <label
              key={donor.donorId}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-bg has-[:checked]:border-success has-[:checked]:bg-success-soft"
            >
              <input
                type="checkbox"
                className="size-4 accent-success"
                checked={checked}
                onChange={() => toggle(donor.donorId)}
              />
              <BloodGroupBadge group={donor.bloodGroup} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{donor.name}</span>
                <span className="block text-caption text-text-subtle">{donor.city}</span>
              </span>
              {checked && <CheckCircle2 size={18} className="text-success" aria-hidden="true" />}
            </label>
          );
        })}
      </fieldset>

      <p className="text-label text-text-muted">
        <strong className="text-ink">{picked.length}</strong> of {accepted.length} donated · {request.unitsNeeded}{' '}
        {request.unitsNeeded === 1 ? 'unit' : 'units'} were needed
      </p>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onDone} disabled={closeRequest.isPending}>
          Not yet
        </Button>
        <Button
          onClick={submit}
          loading={closeRequest.isPending}
          disabled={picked.length === 0}
          leftIcon={<CheckCircle2 size={16} aria-hidden="true" />}
        >
          Mark fulfilled
        </Button>
      </div>
    </div>
  );
}

function CancelForm({ request, onDone }: { request: BloodRequestDetail; onDone: () => void }) {
  const closeRequest = useCloseRequest(request.id);

  const submit = () =>
    closeRequest.mutate(
      { status: 'CANCELLED' },
      {
        onSuccess: () => {
          toast.success(`#${request.reference} cancelled.`);
          onDone();
        },
      },
    );

  return (
    <div className="flex flex-col gap-5 p-5">
      <p className="text-body text-text-muted">
        Cancel this request if the blood is no longer needed. Donors stop seeing it, nobody else is asked, and no
        donations are recorded. <strong className="text-ink">This can't be undone.</strong>
      </p>
      <FormAlert>{closeRequest.error?.message ?? null}</FormAlert>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onDone} disabled={closeRequest.isPending}>
          Keep it open
        </Button>
        <Button
          variant="dark"
          onClick={submit}
          loading={closeRequest.isPending}
          leftIcon={<XCircle size={16} aria-hidden="true" />}
        >
          Yes, cancel request
        </Button>
      </div>
    </div>
  );
}
