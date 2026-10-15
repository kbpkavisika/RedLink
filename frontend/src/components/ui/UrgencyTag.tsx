import { useTranslation } from 'react-i18next';
import type { Urgency } from '../../types';
import { Badge } from './Badge';

// Red is reserved for critical, so only CRITICAL gets the solid red tag; the rest are calm badges
export function UrgencyTag({ urgency }: { urgency: Urgency }) {
  const { t } = useTranslation();
  if (urgency === 'CRITICAL') {
    return (
      <span className="inline-flex h-6 items-center rounded-sm bg-primary px-2 text-caption font-semibold text-white">
        {t('status.urgency.CRITICAL')}
      </span>
    );
  }
  return <Badge tone={urgency === 'HIGH' ? 'warning' : 'neutral'}>{t(`status.urgency.${urgency}`)}</Badge>;
}
