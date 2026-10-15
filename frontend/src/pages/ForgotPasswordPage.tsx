import { ArrowLeft, KeyRound } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { PublicLayout } from '../components/layout/PublicLayout';
import { LinkButton, Panel } from '../components/ui';

/**
 * Nobody, admins included, can see or change another user's password, and reset by email isn't built yet,
 * so for now this page can only explain that.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  return (
    <PublicLayout>
      <Panel padded>
        <div className="flex flex-col gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <KeyRound size={22} aria-hidden="true" />
          </div>
          <h1 className="font-display text-display-sm text-ink">{t('auth.forgot.title')}</h1>
          <p className="text-body text-text-muted">{t('auth.forgot.body')}</p>
          <p className="text-body text-text-muted">
            <Trans i18nKey="auth.forgot.contact" components={{ link: <a href="mailto:admin@redlink.lk" /> }} />
          </p>
          <LinkButton to="/login" variant="outline" leftIcon={<ArrowLeft size={16} aria-hidden="true" />} className="self-start">
            {t('auth.forgot.back')}
          </LinkButton>
        </div>
      </Panel>
    </PublicLayout>
  );
}
