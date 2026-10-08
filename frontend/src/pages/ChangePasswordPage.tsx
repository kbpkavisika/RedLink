import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import * as authApi from '../api/auth';
import { useAuth } from '../auth/useAuth';
import { Button, FormAlert, LinkButton, Panel, PasswordInput } from '../components/ui';
import { applyFieldErrors } from '../lib/formErrors';
import { homePathFor } from '../lib/roles';
import { tokenStore } from '../lib/tokenStore';
import type { ApiError } from '../types';

// Same limits as the backend (ChangePasswordRequest): 8–72 characters, different from the current one
const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(72, 'Use at most 72 characters'),
    confirmPassword: z.string().min(1, 'Type the new password again'),
  })
  .refine((form) => form.newPassword === form.confirmPassword, {
    path: ['confirmPassword'],
    message: "The passwords don't match",
  })
  .refine((form) => form.newPassword !== form.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password that is different from your current one',
  });

type ChangePasswordForm = z.infer<typeof schema>;

/**
 * Any signed-in user can change their password here. Users with a temporary password (the first one an admin
 * gave a new staff member, or the first-admin seeder's) are sent here by RequireAuth and can't leave until they choose a new one.
 */
export function ChangePasswordPage() {
  const { user, startSession, logout } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  if (!user) return null; // RequireAuth guarantees a user

  const mustChange = user.mustChangePassword;
  const home = homePathFor(user.role);

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null);
    try {
      const response = await authApi.changePassword({ currentPassword, newPassword });
      // The old token no longer works; the new one is saved where it was. mustChangePassword is now false,
      // so RequireAuth lets them through.
      startSession(response, tokenStore.isRemembered());
      toast.success('Your password has been changed.');
      navigate(home, { replace: true });
    } catch (error) {
      const apiError = error as ApiError;
      if (!applyFieldErrors(apiError, setError, ['currentPassword', 'newPassword'])) {
        setFormError(apiError.message);
      }
    }
  });

  return (
    <div className="mx-auto w-full max-w-[480px]">
      <Panel padded>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-title-lg text-ink">{mustChange ? 'Choose a new password' : 'Change your password'}</h2>
            <p className="text-body text-text-muted">
              {mustChange
                ? 'You signed in with a temporary password. Choose your own to continue.'
                : 'You stay signed in on this device; other devices are signed out.'}
            </p>
          </div>

          <FormAlert>{formError}</FormAlert>

          <PasswordInput
            label={mustChange ? 'Temporary password' : 'Current password'}
            autoComplete="current-password"
            autoFocus
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            hint="8 to 72 characters"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordInput
            label="Confirm new password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            {mustChange ? (
              // Nowhere else to go yet, so the only other way out is signing out
              <Button variant="text" onClick={logout}>
                Sign out
              </Button>
            ) : (
              <LinkButton to={home} variant="outline">
                Cancel
              </LinkButton>
            )}
            <Button type="submit" loading={isSubmitting}>
              Change password
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
