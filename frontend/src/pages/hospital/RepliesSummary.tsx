import { useTranslation } from 'react-i18next';
import type { RequestListItem } from '../../types';

// "2 coming · 1 declined" while open; "2 donated" once fulfilled
export function RepliesSummary({ request }: { request: RequestListItem }) {
  const { t } = useTranslation();
  if (request.status === 'FULFILLED') {
    return <span className="text-success">{t('hospital.summary.donated', { count: request.donated })}</span>;
  }
  const parts = [
    request.coming > 0 && t('hospital.summary.coming', { count: request.coming }),
    request.withdrew > 0 && t('hospital.summary.withdrew', { count: request.withdrew }),
    request.declined > 0 && t('hospital.summary.declined', { count: request.declined }),
  ].filter(Boolean);
  return parts.length === 0 ? (
    <span className="text-text-subtle">{t('hospital.summary.none')}</span>
  ) : (
    <span className={request.coming > 0 ? 'text-ink' : 'text-text-muted'}>{parts.join(' · ')}</span>
  );
}
