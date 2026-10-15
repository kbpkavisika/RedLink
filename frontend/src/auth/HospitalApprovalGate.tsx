import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { Button, Panel, StateView, StepProgress } from '../components/ui';
import { useAuth } from './useAuth';

/**
 * Wraps every /hospital page (H2, business rule 1): staff of a hospital that isn't APPROVED see its approval
 * progress instead of the page. The status comes from the signed-in user, so it's re-read from the API when the
 * gate opens and on "Check again", to pick up an approval that happened after sign-in.
 *
 * Only for convenience: the backend refuses to post requests for a hospital that isn't approved.
 */
export function HospitalApprovalGate() {
  const { t } = useTranslation();
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
      toast.error(t('auth.approval.checkFailed'));
    } finally {
      setChecking(false);
    }
  };

  const hospital = user?.hospitalName ?? t('auth.approval.yourHospital');
  const approvalSteps = [t('auth.approval.registered'), t('auth.approval.underReview'), t('auth.approval.approved')];

  if (status === 'REJECTED') {
    return (
      <Panel>
        <StateView
          state="blocked"
          title={t('auth.approval.rejectedTitle')}
          description={
            <Trans
              i18nKey="auth.approval.rejectedBody"
              values={{ hospital }}
              components={{ link: <a href="mailto:admin@redlink.lk" /> }}
            />
          }
        >
          <StepProgress steps={approvalSteps} current={1} tone="error" />
          {user?.hospitalRejectionReason && (
            <p className="max-w-[360px] rounded-lg border border-dashed border-border-strong px-4 py-3 text-left text-label text-text-muted">
              <span className="font-semibold text-ink">{t('auth.approval.reason')}</span> {user.hospitalRejectionReason}
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
        title={t('auth.approval.pendingTitle')}
        description={t('auth.approval.pendingBody', { hospital })}
        action={
          <Button
            variant="outline"
            loading={checking}
            leftIcon={<RefreshCw size={16} aria-hidden="true" />}
            onClick={checkAgain}
          >
            {t('auth.approval.checkAgain')}
          </Button>
        }
      >
        <StepProgress steps={approvalSteps} current={1} />
      </StateView>
    </Panel>
  );
}
