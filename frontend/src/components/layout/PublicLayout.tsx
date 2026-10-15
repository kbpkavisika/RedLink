import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BackButton } from './BackButton';
import { LanguageSwitcher } from './LanguageSwitcher';

// Simple centred layout for pages outside the app shell (forgot password, 404), with a back arrow
export function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-[440px] flex-col gap-6">
        <div className="relative flex items-center justify-center">
          <BackButton fallback="/" className="absolute left-0" />
          <Link to="/" aria-label={t('common.homeLink')}>
            <img src="/brand/redlink-logo.svg" alt="RedLink" className="h-8" />
          </Link>
          <LanguageSwitcher className="absolute right-0" />
        </div>
        {children}
      </div>
    </div>
  );
}