import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import * as authApi from '../api/auth';
import { useAuth } from '../auth/useAuth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button, FormAlert, Input, PasswordInput } from '../components/ui';
import { CITIES } from '../lib/cities';
import { applyFieldErrors } from '../lib/formErrors';
import { emailField, fullNameField, newPasswordField, phoneField } from '../lib/validation';
import type { ApiError } from '../types';

function required(what: string, max: number) {
  return z.string().trim().min(1, `Enter ${what}`).max(max, `Use at most ${max} characters`);
}

// Same limits as the backend (RegisterHospitalRequest)
const schema = z.object({
  hospital: z.object({
    name: required("the hospital's name", 200),
    registrationNo: required('the registration number', 100),
    address: required("the hospital's address", 300),
    city: required("the hospital's city", 100),
    phone: phoneField,
  }),
  staff: z.object({
    fullName: fullNameField,
    email: emailField,
    phone: phoneField,
    password: newPasswordField,
  }),
});

type RegisterHospitalForm = z.input<typeof schema>;
type RegisterHospitalValues = z.output<typeof schema>;

// The backend's field names ("hospital.registrationNo") are the same as the form's
const FIELDS = [
  'hospital.name',
  'hospital.registrationNo',
  'hospital.address',
  'hospital.city',
  'hospital.phone',
  'staff.fullName',
  'staff.email',
  'staff.phone',
  'staff.password',
] as const;

/**
 * "Register a hospital" (H1). Creates the hospital (PENDING) and the person registering as its first staff user,
 * then signs them in. Until an admin approves the hospital, they see the approval progress instead of posting.
 */
export function RegisterHospitalPage() {
  const { startSession } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterHospitalForm, unknown, RegisterHospitalValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      hospital: { name: '', registrationNo: '', address: '', city: '', phone: '' },
      staff: { fullName: '', email: '', phone: '', password: '' },
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const response = await authApi.registerHospital(values);
      toast.success("Registration received. We'll review it within 1–2 working days.");
      startSession(response, false);
    } catch (error) {
      const apiError = error as ApiError;
      // 409 for a registration number or email that's already used lands on that field
      if (!applyFieldErrors(apiError, setError, FIELDS)) {
        setFormError(apiError.message);
      }
    }
  });

  return (
    <AuthLayout>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-display-md text-ink">Register a hospital</h1>
        <p className="text-body text-text-muted">
          An admin checks every hospital before it can post blood requests. This usually takes 1–2 working days.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
        <FormAlert>{formError}</FormAlert>

        <FormSection title="Hospital" description="As it appears on your registration with the Ministry of Health.">
          <Input
            label="Hospital name"
            autoComplete="organization"
            autoFocus
            error={errors.hospital?.name?.message}
            {...register('hospital.name')}
          />
          <Input
            label="Registration number"
            hint="Admins use it to confirm the hospital is real"
            error={errors.hospital?.registrationNo?.message}
            {...register('hospital.registrationNo')}
          />
          <Input
            label="Address"
            autoComplete="street-address"
            error={errors.hospital?.address?.message}
            {...register('hospital.address')}
          />
          <Input
            label="City"
            list="hospital-city-suggestions"
            autoComplete="address-level2"
            hint="Donors in this city are matched first"
            error={errors.hospital?.city?.message}
            {...register('hospital.city')}
          />
          <datalist id="hospital-city-suggestions">
            {CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          <Input
            label="Hospital phone"
            type="tel"
            inputMode="tel"
            placeholder="0112345678"
            hint="The blood bank or main line donors can call"
            error={errors.hospital?.phone?.message}
            {...register('hospital.phone')}
          />
        </FormSection>

        <FormSection title="Your account" description="You'll be the hospital's first staff user. An admin can add your colleagues later.">
          <Input label="Full name" autoComplete="name" error={errors.staff?.fullName?.message} {...register('staff.fullName')} />
          <Input
            label="Work email"
            type="email"
            autoComplete="email"
            error={errors.staff?.email?.message}
            {...register('staff.email')}
          />
          <Input
            label="Mobile number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0771234567"
            error={errors.staff?.phone?.message}
            {...register('staff.phone')}
          />
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            hint="8 to 72 characters"
            error={errors.staff?.password?.message}
            {...register('staff.password')}
          />
        </FormSection>

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Submit for approval
        </Button>
      </form>

      <p className="text-center text-body text-text-muted">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-4 flex flex-col gap-1">
        <span className="text-eyebrow text-primary uppercase">{title}</span>
        <span className="text-label text-text-muted">{description}</span>
      </legend>
      {children}
    </fieldset>
  );
}
