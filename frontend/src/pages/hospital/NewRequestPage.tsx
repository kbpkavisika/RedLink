import { useAuth } from '../../auth/useAuth';
import { Panel, StateView, StepProgress } from '../../components/ui';
import { ComingSoonPage } from '../ComingSoonPage';

const approvalSteps = ['Registered', 'Under review', 'Approved'];

// Posting is blocked until an admin approves the hospital (business rule 1)
export function NewRequestPage() {
  const { user } = useAuth();

  if (user?.hospitalStatus === 'PENDING') {
    return (
      <Panel>
        <StateView
          state="blocked"
          title="Posting unlocks after approval"
          description="An admin is reviewing your hospital's registration. This usually takes 1–2 working days."
        >
          <StepProgress steps={approvalSteps} current={1} />
        </StateView>
      </Panel>
    );
  }

  if (user?.hospitalStatus === 'REJECTED') {
    return (
      <Panel>
        <StateView
          state="blocked"
          title="Your hospital's registration wasn't approved"
          description={
            <>
              You can't post requests. Contact <a href="mailto:admin@redlink.lk">admin@redlink.lk</a> to find out why
              or to register again.
            </>
          }
        >
          <StepProgress steps={approvalSteps} current={1} tone="error" />
        </StateView>
      </Panel>
    );
  }

  return (
    <ComingSoonPage
      title="The new request form"
      description="Blood group, units, urgency, city and deadline, then the matched donors. Built in the blood requests branch."
    />
  );
}
