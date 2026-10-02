import { Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Button, StateView } from '../../components/ui';

interface TemporaryPasswordNoticeProps {
  title: string;
  fullName: string;
  email: string;
  password: string;
  children?: ReactNode; // buttons under the notice
}

/**
 * Shown once after an admin sets a temporary password: the admin passes it on (by phone or in person, never
 * by email to the same inbox), and the user must replace it at first sign-in. It isn't shown again.
 */
export function TemporaryPasswordNotice({ title, fullName, email, password, children }: TemporaryPasswordNoticeProps) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Password copied.');
    } catch {
      toast.error("Couldn't copy. Select the password and copy it yourself.");
    }
  };

  return (
    <StateView
      state="success"
      title={title}
      description={
        <>
          Give <strong className="text-ink">{fullName}</strong> this temporary password. They sign in with{' '}
          <span className="break-all">{email}</span> and must choose a new password straight away.
        </>
      }
      secondaryAction={children}
    >
      <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface py-1.5 pr-1.5 pl-4">
        <code className="font-mono text-title-md tracking-wide text-ink select-all">{password}</code>
        <Button variant="icon" size="sm" aria-label="Copy password" onClick={() => void copy()}>
          <Copy size={16} aria-hidden="true" />
        </Button>
      </div>
      <p className="max-w-[300px] text-caption text-text-subtle">It won't be shown again.</p>
    </StateView>
  );
}
