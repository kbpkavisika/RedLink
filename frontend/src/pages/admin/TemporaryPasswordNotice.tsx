import { Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import { Button, StateView } from '../../components/ui';

interface TemporaryPasswordNoticeProps {
  title: string;
  fullName: string;
  email: string;
  password: string;
  children?: ReactNode; // buttons under the notice
}

/**
 * Shown once after an admin adds a staff user with a first password: the admin passes it on (by phone or in person, never
 * by email to the same inbox), and the user must replace it at first sign-in. It isn't shown again.
 */
export function TemporaryPasswordNotice({ title, fullName, email, password, children }: TemporaryPasswordNoticeProps) {
  const { t } = useTranslation();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success(t('admin.tempPassword.copied'));
    } catch {
      toast.error(t('admin.tempPassword.copyFailed'));
    }
  };

  return (
    <StateView
      state="success"
      title={title}
      description={
        <Trans
          i18nKey="admin.tempPassword.give"
          values={{ name: fullName, email }}
          components={{ b: <strong className="text-ink" />, email: <span className="break-all" /> }}
        />
      }
      secondaryAction={children}
    >
      <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface py-1.5 pr-1.5 pl-4">
        <code className="font-mono text-title-md tracking-wide text-ink select-all">{password}</code>
        <Button variant="icon" size="sm" aria-label={t('admin.tempPassword.copy')} onClick={() => void copy()}>
          <Copy size={16} aria-hidden="true" />
        </Button>
      </div>
      <p className="max-w-[300px] text-caption text-text-subtle">{t('admin.tempPassword.notShownAgain')}</p>
    </StateView>
  );
}
