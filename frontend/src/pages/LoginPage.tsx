import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ChevronRight, Droplet, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../auth/useAuth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button, Input } from '../components/ui';
import { applyFieldErrors } from '../lib/formErrors';
import type { ApiError } from '../types';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email, e.g. name@example.lk'),
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean(),
});

type LoginForm = z.infer<typeof schema>;

/**
 * One sign-in for every role (S1, S2). After a successful sign-in the user is set in AuthProvider and
 * RedirectIfAuthenticated sends them on: to ?from=…, /change-password if their password is temporary, or their home.
 */
export function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
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
        <h1 className="font-display text-display-md text-ink">Sign in</h1>
        <p className="text-body text-text-muted">Hospital staff, donors and admins use the same sign-in.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {formError && (
          <p role="alert" className="rounded-lg bg-primary-subtle px-4 py-3 text-label text-primary-hover">
            {formError}
          </p>
        )}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          error={errors.password?.message}
          labelAction={<Link to="/forgot-password">Forgot password?</Link>}
          rightSlot={
            <Button
              variant="icon"
              size="sm"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((shown) => !shown)}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
            </Button>
          }
          {...register('password')}
        />

        <label className="flex cursor-pointer items-center gap-2.5 text-body text-ink">
          <input type="checkbox" className="size-4 accent-primary" {...register('remember')} />
          Keep me signed in on this device
        </label>

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-caption text-text-subtle" role="separator">
          <span className="h-px flex-1 bg-border" />
          New to RedLink?
          <span className="h-px flex-1 bg-border" />
        </div>
        <OptionCard to="/register/donor" icon={Droplet} title="Become a donor" description="Get alerts when you can help" />
        <OptionCard
          to="/register/hospital"
          icon={Building2}
          title="Register a hospital"
          description="Needs admin approval"
        />
      </div>

      {import.meta.env.DEV && (
        <p className="rounded-lg border border-dashed border-border-strong px-4 py-3 text-label text-text-muted">
          Development: <Link to="/dev/components">sign in as a test user</Link> in the component gallery.
        </p>
      )}
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
