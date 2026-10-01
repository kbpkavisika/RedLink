import { createContext } from 'react';
import type { CurrentUser, LoginResponse } from '../types';

export type AuthStatus =
  | 'loading' // a saved token is being checked with GET /auth/me
  | 'authenticated'
  | 'anonymous';

export interface AuthContextValue {
  user: CurrentUser | null;
  status: AuthStatus;
  // Resolves with the signed-in user, so the caller can redirect by role
  login: (email: string, password: string, remember: boolean) => Promise<CurrentUser>;
  // Signs in with a token the API already issued, e.g. the response to a registration
  startSession: (response: LoginResponse, remember: boolean) => void;
  logout: () => void;
  // Reload the user after something about them changed, e.g. after changing the password
  refreshUser: () => Promise<void>;
  // Development only (undefined in production builds): act as a test user without the backend
  devSignIn?: (user: CurrentUser) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
