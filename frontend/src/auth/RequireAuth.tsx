import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '../components/layout/FullPageLoader';
import { homePathFor } from '../lib/roles';
import type { Role } from '../types';
import { useAuth } from './useAuth';

interface RequireAuthProps {
  // Leave out to allow any signed-in user
  role?: Role;
}

/**
 * Wraps routes that need a signed-in user:
 *   still checking the token      → loader
 *   not signed in                 → /login?from=<this page>
 *   must change password          → /change-password
 *   wrong role (donor on /admin)  → their own home
 *
 * This is for convenience only. The backend's 401/403 is the real protection.
 */
export function RequireAuth({ role }: RequireAuthProps) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <FullPageLoader />;
  }

  if (!user) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?from=${from}`} replace />;
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  return <Outlet />;
}
