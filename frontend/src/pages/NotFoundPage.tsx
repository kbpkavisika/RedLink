import { MapPinOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../components/layout/PublicLayout';
import { LinkButton, Panel, StateView } from '../components/ui';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <PublicLayout>
      <Panel>
        <StateView
          state="no-results"
          icon={MapPinOff}
          title={t('notFound.title')}
          description={t('notFound.body')}
          action={<LinkButton to="/">{t('notFound.home')}</LinkButton>}
        />
      </Panel>
    </PublicLayout>
  );
}
