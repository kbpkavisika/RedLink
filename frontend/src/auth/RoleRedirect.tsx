import { Navigate } from 'react-router-dom';
import { FullPageLoader } from '../components/layout/FullPageLoader';
import { homePathFor } from '../lib/roles';
import { useAuth } from './useAuth';

// "/" sends each user to their own home, or to sign in
export function RoleRedirect() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <FullPageLoader />;
  }
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}
