import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { Panel } from '../components/ui';

// Placeholder: the designed sign-in page (design.md §6.1) is built with the authentication branch
export function LoginPage() {
  return (
    <PublicLayout>
      <Panel padded>
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-display-md text-ink">Sign in</h1>
          <p className="text-body text-text-muted">
            Hospital staff, donors and admins use the same sign-in. The sign-in form arrives with the
            authentication feature.
          </p>
          <Link to="/forgot-password" className="self-start text-label font-semibold no-underline">
            Forgot password?
          </Link>
          {import.meta.env.DEV && (
            <p className="rounded-lg border border-dashed border-border-strong px-4 py-3 text-label text-text-muted">
              Development: <Link to="/dev/components">sign in as a test user</Link> in the component gallery.
            </p>
          )}
        </div>
      </Panel>
    </PublicLayout>
  );
}
