import { ArrowLeft, KeyRound } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { LinkButton, Panel } from '../components/ui';

// v1 has no password reset by email: an admin sets a temporary password instead
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
            Contact your RedLink administrator at <a href="mailto:admin@redlink.lk">admin@redlink.lk</a> and
            they'll set a temporary password for you. You'll choose a new one the next time you sign in.
          </p>
          <LinkButton to="/login" variant="outline" leftIcon={<ArrowLeft size={16} aria-hidden="true" />} className="self-start">
            Back to sign in
          </LinkButton>
        </div>
      </Panel>
    </PublicLayout>
  );
}
