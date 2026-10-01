import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Outlet } from 'react-router-dom';
import { Button, Panel, StateView, StepProgress } from '../components/ui';
import { useAuth } from './useAuth';

const approvalSteps = ['Registered', 'Under review', 'Approved'];

/**
 * Wraps every /hospital page (H2, business rule 1): staff of a hospital that isn't APPROVED see its approval
 * progress instead of the page. The status comes from the signed-in user, so it's re-read from the API when the
 * gate opens and on "Check again", to pick up an approval that happened after sign-in.
 *
 * Only for convenience: the backend refuses to post requests for a hospital that isn't approved.
 */
export function HospitalApprovalGate() {
  const { user, refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const status = user?.hospitalStatus;
  const waiting = status !== undefined && status !== 'APPROVED';

  // Re-read the status once when a waiting user opens a hospital page
  useEffect(() => {
    if (waiting) {
      refreshUser().catch(() => {
        // keep showing the last known status; a 401 already signs the user out
      });
    }
    // Only on entering the gate, not every time the user object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!waiting) {
    return <Outlet />;
  }

  const checkAgain = async () => {
    setChecking(true);
    try {
      await refreshUser();
      // If it's now APPROVED, the gate re-renders with the page instead
    } catch {
      toast.error("We couldn't check right now. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const hospital = user?.hospitalName ?? 'Your hospital';

  if (status === 'REJECTED') {
    return (
      <Panel>
        <StateView
          state="blocked"
          title="Registration was not approved"
          description={
            <>
              {hospital} can't post blood requests. Contact <a href="mailto:admin@redlink.lk">admin@redlink.lk</a> if
              you think this is a mistake or want to register again.
            </>
          }
        >
          <StepProgress steps={approvalSteps} current={1} tone="error" />
          {user?.hospitalRejectionReason && (
            <p className="max-w-[360px] rounded-lg border border-dashed border-border-strong px-4 py-3 text-left text-label text-text-muted">
              <span className="font-semibold text-ink">Reason from the admin:</span> {user.hospitalRejectionReason}
            </p>
          )}
        </StateView>
      </Panel>
    );
  }

  return (
    <Panel>
      <StateView
        state="blocked"
        title="Posting unlocks after approval"
        description={`An admin is reviewing ${hospital}'s registration. This usually takes 1–2 working days.`}
        action={
          <Button
            variant="outline"
            loading={checking}
            leftIcon={<RefreshCw size={16} aria-hidden="true" />}
            onClick={checkAgain}
          >
            Check again
          </Button>
        }
      >
        <StepProgress steps={approvalSteps} current={1} />
      </StateView>
    </Panel>
  );
}
