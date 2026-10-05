import { ArrowLeft, KeyRound } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { LinkButton, Panel } from '../components/ui';

/**
 * Nobody, admins included, can see or change another user's password, and reset by email isn't built yet,
 * so for now this page can only explain that.
 */
export function ForgotPasswordPage() {
  return (
    <PublicLayout>
      <Panel padded>
        <div className="flex flex-col gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <KeyRound size={22} aria-hidden="true" />
          </div>
          <h1 className="font-display text-display-sm text-ink">Forgot your password?</h1>
          <p className="text-body text-text-muted">
            Resetting a password by email isn't available yet. For your security, nobody at RedLink, including
            administrators, can see or change your password.
          </p>
          <p className="text-body text-text-muted">
            If you can't sign in, contact <a href="mailto:admin@redlink.lk">admin@redlink.lk</a>.
          </p>
          <LinkButton to="/login" variant="outline" leftIcon={<ArrowLeft size={16} aria-hidden="true" />} className="self-start">
            Back to sign in
          </LinkButton>
        </div>
      </Panel>
    </PublicLayout>
  );
}
