import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ChevronRight, Droplet, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../auth/useAuth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button, FormAlert, Input, PasswordInput } from '../components/ui';
import { applyFieldErrors } from '../lib/formErrors';
import { msg } from '../lib/messages';
import type { ApiError } from '../types';

const schema = z.object({
  email: z.string().trim().min(1, msg('enterEmail')).pipe(z.email(msg('validEmail'))),
  password: z.string().min(1, msg('enterPassword')),
  remember: z.boolean(),
});

type LoginForm = z.infer<typeof schema>;

/**
 * One sign-in for every role (S1, S2). After a successful sign-in the user is set in AuthProvider and
 * RedirectIfAuthenticated sends them on: to ?from=…, /change-password if their password is temporary, or their home.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = handleSubmit(async ({ email, password, remember }) => {
    setFormError(null);
    try {
      await login(email, password, remember);
    } catch (error) {
      const apiError = error as ApiError;
      // 401 wrong email/password, 403 disabled account, network errors: one message above the form
      if (!applyFieldErrors(apiError, setError, ['email', 'password'])) {
        setFormError(apiError.message);
      }
    }
  });

  return (
    <AuthLayout>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-display-md text-ink">{t('auth.login.title')}</h1>
        <p className="text-body text-text-muted">{t('auth.login.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormAlert>{formError}</FormAlert>

        <Input
          label={t('common.email')}
          type="email"
          autoComplete="email"
          autoFocus
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordInput
          label={t('common.password')}
          autoComplete="current-password"
          error={errors.password?.message}
          labelAction={<Link to="/forgot-password">{t('auth.login.forgot')}</Link>}
          {...register('password')}
        />

        <label className="flex min-h-9 cursor-pointer items-center gap-2.5 self-start text-body text-ink">
          <input type="checkbox" className="size-4 accent-primary" {...register('remember')} />
          {t('auth.login.remember')}
        </label>

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {t('common.signIn')}
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-caption text-text-subtle" role="separator">
          <span className="h-px flex-1 bg-border" />
          {t('auth.login.newHere')}
          <span className="h-px flex-1 bg-border" />
        </div>
        <OptionCard
          to="/register/donor"
          icon={Droplet}
          title={t('auth.login.donorTitle')}
          description={t('auth.login.donorBody')}
        />
        <OptionCard
          to="/register/hospital"
          icon={Building2}
          title={t('auth.login.hospitalTitle')}
          description={t('auth.login.hospitalBody')}
        />
      </div>
    </AuthLayout>
  );
}

interface OptionCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

function OptionCard({ to, icon: Icon, title, description }: OptionCardProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-ink no-underline transition-colors hover:border-border-strong hover:bg-bg focus-visible:shadow-focus focus-visible:outline-none"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-body font-semibold">{title}</span>
        <span className="text-caption text-text-muted">{description}</span>
      </span>
      <ChevronRight size={18} strokeWidth={1.75} className="text-text-subtle" aria-hidden="true" />
    </Link>
  );
}
