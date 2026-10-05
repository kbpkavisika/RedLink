import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth/authContext';
import type { CurrentUser } from '../types';

export const donor: CurrentUser = {
  id: 1,
  fullName: 'Kamal Perera',
  email: 'kamal@test.redlink.lk',
  role: 'DONOR',
  mustChangePassword: false,
};

export const staff: CurrentUser = {
  id: 2,
  fullName: 'Dilini Perera',
  email: 'dilini@test.redlink.lk',
  role: 'HOSPITAL_STAFF',
  hospitalId: 1,
  hospitalName: 'National Hospital Colombo',
  hospitalCity: 'Colombo',
  hospitalStatus: 'APPROVED',
  mustChangePassword: false,
};

/**
 * Renders a page as if `auth` were the signed-in state, at the given URL, with a fresh query cache.
 * Nothing calls the real API: pass vi.fn() for anything the page uses (e.g. login).
 */
export function renderWithAuth(ui: ReactElement, auth: Partial<AuthContextValue> = {}, url = '/') {
  const value: AuthContextValue = {
    user: null,
    status: 'anonymous',
    login: vi.fn(),
    startSession: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    ...auth,
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    auth: value,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={value}>
          <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    ),
  };
}
