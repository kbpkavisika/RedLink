import { ComingSoonPage } from '../ComingSoonPage';

// Only reached once the hospital is APPROVED: HospitalApprovalGate shows the approval progress before that
export function NewRequestPage() {
  return (
    <ComingSoonPage
      title="The new request form"
      description="Blood group, units, urgency, city and deadline, then the matched donors. Built in the blood requests branch."
    />
  );
}
