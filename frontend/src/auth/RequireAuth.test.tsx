import { screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { donor, renderWithAuth, staff } from '../test/renderWithAuth';
import { RequireAuth } from './RequireAuth';

// Shows where the guard sent us
function Where() {
  const location = useLocation();
  return <p>at {location.pathname + location.search}</p>;
}

function routes() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route path="/change-password" element={<p>change password page</p>} />
        <Route element={<RequireAuth role="DONOR" />}>
          <Route path="/donor/requests" element={<p>donor requests page</p>} />
        </Route>
      </Route>
      <Route path="*" element={<Where />} />
    </Routes>
  );
}

describe('RequireAuth (convenience only; the backend’s 401/403 is the real protection)', () => {
  it('sends signed-out visitors to sign in, remembering where they were going', () => {
    renderWithAuth(routes(), { user: null, status: 'anonymous' }, '/donor/requests');

    expect(screen.getByText('at /login?from=%2Fdonor%2Frequests')).toBeInTheDocument();
  });

  it('lets the right role in', () => {
    renderWithAuth(routes(), { user: donor, status: 'authenticated' }, '/donor/requests');

    expect(screen.getByText('donor requests page')).toBeInTheDocument();
  });

  it('sends the wrong role back to their own home', () => {
    renderWithAuth(routes(), { user: staff, status: 'authenticated' }, '/donor/requests');

    expect(screen.getByText('at /hospital')).toBeInTheDocument();
  });

  it('keeps users with a temporary password on the change-password page', () => {
    renderWithAuth(routes(), { user: { ...donor, mustChangePassword: true }, status: 'authenticated' }, '/donor/requests');

    expect(screen.getByText('change password page')).toBeInTheDocument();
  });

  it('shows a loader while a saved session is being checked', () => {
    renderWithAuth(routes(), { user: null, status: 'loading' }, '/donor/requests');

    expect(screen.queryByText('donor requests page')).not.toBeInTheDocument();
    expect(screen.queryByText(/^at /)).not.toBeInTheDocument();
  });
});
