import { useTranslation } from 'react-i18next';
import type { HospitalStatus } from '../../types';
import { Badge, type BadgeTone } from './Badge';

const tones: Record<HospitalStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

export function HospitalStatusBadge({ status }: { status: HospitalStatus }) {
  const { t } = useTranslation();
  return <Badge tone={tones[status]}>{t(`status.hospital.${status}`)}</Badge>;
}
