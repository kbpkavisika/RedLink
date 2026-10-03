import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { tokenStore } from '../lib/tokenStore';
import type { CurrentUser, LoginResponse } from '../types';
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext';

/**
 * Knows who is signed in.
 *
 *   App loads → saved token? ── no ──► anonymous
 *                   │ yes
 *                   ▼
 *              GET /auth/me ── ok ──► authenticated
 *                   │
 *                 fails ──► anonymous (a 401 also removes the token)
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStore.get() ? 'loading' : 'anonymous'));

  const signOutLocally = useCallback(() => {
    setUser(null);
    setStatus('anonymous');
    queryClient.clear(); // don't show the previous user's cached data to the next one
  }, [queryClient]);

  // Restore the session from a saved token
  useEffect(() => {
    if (status !== 'loading') return;
    let cancelled = false;
    authApi
      .fetchCurrentUser()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) signOutLocally();
      });
    return () => {
      cancelled = true;
    };
  }, [status, signOutLocally]);

  // The API client calls this when any request gets a 401 (token expired)
  useEffect(() => {
    setUnauthorizedHandler(signOutLocally);
    return () => setUnauthorizedHandler(null);
  }, [signOutLocally]);

  const startSession = useCallback((response: LoginResponse, remember: boolean) => {
    tokenStore.set(response.token, remember);
    setUser(response.user);
    setStatus('authenticated');
  }, []);

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const response = await authApi.login({ email: email.trim().toLowerCase(), password, rememberMe: remember });
      startSession(response, remember);
      return response.user;
    },
    [startSession],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    signOutLocally();
  }, [signOutLocally]);

  const refreshUser = useCallback(async () => {
    setUser(await authApi.fetchCurrentUser());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      startSession,
      logout,
      refreshUser,
    }),
    [user, status, login, startSession, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
