import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { tokenStore } from '../lib/tokenStore';
import type { CurrentUser } from '../types';
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext';

// Dev sign-in survives a page reload for the tab's lifetime. import.meta.env.DEV is false in
// production builds, so this code is removed there.
const DEV_USER_KEY = 'redlink.devUser';

function readDevUser(): CurrentUser | null {
  if (!import.meta.env.DEV) return null;
  try {
    const raw = sessionStorage.getItem(DEV_USER_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

function clearDevUser() {
  if (!import.meta.env.DEV) return;
  try {
    sessionStorage.removeItem(DEV_USER_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

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
  const [user, setUser] = useState<CurrentUser | null>(readDevUser);
  const [status, setStatus] = useState<AuthStatus>(() =>
    readDevUser() ? 'authenticated' : tokenStore.get() ? 'loading' : 'anonymous',
  );

  const signOutLocally = useCallback(() => {
    clearDevUser();
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

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const response = await authApi.login({ email: email.trim().toLowerCase(), password });
    tokenStore.set(response.token, remember);
    setUser(response.user);
    setStatus('authenticated');
    return response.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    signOutLocally();
  }, [signOutLocally]);

  const refreshUser = useCallback(async () => {
    setUser(await authApi.fetchCurrentUser());
  }, []);

  const devSignIn = useCallback(
    (devUser: CurrentUser) => {
      if (!import.meta.env.DEV) return;
      tokenStore.clear();
      queryClient.clear();
      try {
        sessionStorage.setItem(DEV_USER_KEY, JSON.stringify(devUser));
      } catch {
        // storage unavailable: the dev user lasts until the page reloads
      }
      setUser(devUser);
      setStatus('authenticated');
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      logout,
      refreshUser,
      devSignIn: import.meta.env.DEV ? devSignIn : undefined,
    }),
    [user, status, login, logout, refreshUser, devSignIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
