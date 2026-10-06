import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithAuth } from '../test/renderWithAuth';
import type { ApiError } from '../types';
import { LoginPage } from './LoginPage';

function apiError(status: number, message: string, fieldErrors: ApiError['fieldErrors'] = []): ApiError {
  return { status, error: '', message, fieldErrors, ref: 'ab12-cd34', timestamp: '', path: '/api/auth/login' };
}

describe('LoginPage (S1, S2)', () => {
  it('checks the fields before sending anything', async () => {
    const login = vi.fn();
    renderWithAuth(<LoginPage />, { login });

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('rejects an email that isn’t one', async () => {
    renderWithAuth(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'Abc123456');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText(/Enter a valid email/)).toBeInTheDocument();
  });

  it('signs in with what was typed, including "Keep me signed in"', async () => {
    const login = vi.fn().mockResolvedValue({});
    renderWithAuth(<LoginPage />, { login });

    await userEvent.type(screen.getByLabelText('Email'), '  kamal@test.redlink.lk ');
    await userEvent.type(screen.getByLabelText('Password'), 'Abc123456');
    await userEvent.click(screen.getByLabelText('Keep me signed in on this device'));
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith('kamal@test.redlink.lk', 'Abc123456', true);
  });

  it('shows the server’s message when the password is wrong', async () => {
    const login = vi.fn().mockRejectedValue(apiError(401, 'Email or password is incorrect.'));
    renderWithAuth(<LoginPage />, { login });

    await userEvent.type(screen.getByLabelText('Email'), 'kamal@test.redlink.lk');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  });

  it('can show and hide the password', async () => {
    renderWithAuth(<LoginPage />);
    const password = screen.getByLabelText('Password');

    expect(password).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
  });
});
