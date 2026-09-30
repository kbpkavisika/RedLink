import { Navigate, Outlet } from 'react-router-dom';
import { FullPageLoader } from '../components/layout/FullPageLoader';
import { homePathFor } from '../lib/roles';
import { useAuth } from './useAuth';

// Sign-in and registration pages: someone already signed in goes to their home instead
export function RedirectIfAuthenticated() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <FullPageLoader />;
  }
  if (user) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }
  return <Outlet />;
}
