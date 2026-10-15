import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import * as authApi from '../api/auth';
import { useAuth } from '../auth/useAuth';
import { Button, FormAlert, LinkButton, Panel, PasswordInput } from '../components/ui';
import { applyFieldErrors } from '../lib/formErrors';
import { msg } from '../lib/messages';
import { homePathFor } from '../lib/roles';
import { tokenStore } from '../lib/tokenStore';
import type { ApiError } from '../types';

// Same limits as the backend (ChangePasswordRequest): 8–72 characters, different from the current one
const schema = z
  .object({
    currentPassword: z.string().min(1, msg('enterCurrentPassword')),
    newPassword: z.string().min(8, msg('tooShort', 8)).max(72, msg('tooLong', 72)),
    confirmPassword: z.string().min(1, msg('confirmPassword')),
  })
  .refine((form) => form.newPassword === form.confirmPassword, {
    path: ['confirmPassword'],
    message: msg('passwordsDontMatch'),
  })
  .refine((form) => form.newPassword !== form.currentPassword, {
    path: ['newPassword'],
    message: msg('passwordSameAsCurrent'),
  });

type ChangePasswordForm = z.infer<typeof schema>;

/**
 * Any signed-in user can change their password here. Users with a temporary password (the first one an admin
 * gave a new staff member, or the first-admin seeder's) are sent here by RequireAuth and can't leave until they choose a new one.
 */
export function ChangePasswordPage() {
  const { t } = useTranslation();
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
      toast.success(t('auth.changePassword.changed'));
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
            <h2 className="text-title-lg text-ink">
              {mustChange ? t('auth.changePassword.chooseTitle') : t('auth.changePassword.changeTitle')}
            </h2>
            <p className="text-body text-text-muted">
              {mustChange ? t('auth.changePassword.chooseBody') : t('auth.changePassword.changeBody')}
            </p>
          </div>

          <FormAlert>{formError}</FormAlert>

          <PasswordInput
            label={mustChange ? t('auth.changePassword.temporary') : t('auth.changePassword.current')}
            autoComplete="current-password"
            autoFocus
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <PasswordInput
            label={t('auth.changePassword.new')}
            autoComplete="new-password"
            hint={t('common.passwordHint')}
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordInput
            label={t('auth.changePassword.confirm')}
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            {mustChange ? (
              // Nowhere else to go yet, so the only other way out is signing out
              <Button variant="text" onClick={logout}>
                {t('common.signOut')}
              </Button>
            ) : (
              <LinkButton to={home} variant="outline">
                {t('common.cancel')}
              </LinkButton>
            )}
            <Button type="submit" loading={isSubmitting}>
              {t('auth.changePassword.submit')}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
