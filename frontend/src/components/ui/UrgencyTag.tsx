import type { Urgency } from '../../types';
import { Badge } from './Badge';

const labels: Record<Urgency, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

// Red is reserved for critical, so only CRITICAL gets the solid red tag; the rest are calm badges
export function UrgencyTag({ urgency }: { urgency: Urgency }) {
  if (urgency === 'CRITICAL') {
    return (
      <span className="inline-flex h-6 items-center rounded-sm bg-primary px-2 text-caption font-semibold text-white">
        {labels.CRITICAL}
      </span>
    );
  }
  return <Badge tone={urgency === 'HIGH' ? 'warning' : 'neutral'}>{labels[urgency]}</Badge>;
}
