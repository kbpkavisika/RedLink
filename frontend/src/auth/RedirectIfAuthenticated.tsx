import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { FullPageLoader } from '../components/layout/FullPageLoader';
import { safeRedirectPath } from '../lib/redirect';
import { homePathFor } from '../lib/roles';
import { useAuth } from './useAuth';

// Sign-in and registration pages: someone signed in goes back to the page that sent them to /login
// (?from=…), or to their home. This also does the redirect right after a successful sign-in.
export function RedirectIfAuthenticated() {
  const { user, status } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'loading') {
    return <FullPageLoader />;
  }
  if (user) {
    // A ?from= page of another role is fine: RequireAuth sends them on to their own home
    return <Navigate to={safeRedirectPath(searchParams.get('from')) ?? homePathFor(user.role)} replace />;
  }
  return <Outlet />;
}
