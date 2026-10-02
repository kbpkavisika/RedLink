import type { HospitalStatus } from '../../types';
import { Badge, type BadgeTone } from './Badge';

const look: Record<HospitalStatus, { tone: BadgeTone; label: string }> = {
  PENDING: { tone: 'warning', label: 'Pending' },
  APPROVED: { tone: 'success', label: 'Approved' },
  REJECTED: { tone: 'error', label: 'Rejected' },
};

export function HospitalStatusBadge({ status }: { status: HospitalStatus }) {
  const { tone, label } = look[status];
  return <Badge tone={tone}>{label}</Badge>;
}
