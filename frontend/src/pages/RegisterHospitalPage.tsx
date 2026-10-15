import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import * as authApi from '../api/auth';
import { useAuth } from '../auth/useAuth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button, FormAlert, Input, PasswordInput } from '../components/ui';
import { CITIES } from '../lib/cities';
import { applyFieldErrors } from '../lib/formErrors';
import { msg } from '../lib/messages';
import { emailField, fullNameField, newPasswordField, phoneField } from '../lib/validation';
import type { ApiError } from '../types';

function required(missing: Parameters<typeof msg>[0], max: number) {
  return z.string().trim().min(1, msg(missing)).max(max, msg('tooLong', max));
}

// Same limits as the backend (RegisterHospitalRequest)
const schema = z.object({
  hospital: z.object({
    name: required('enterHospitalName', 200),
    registrationNo: required('enterRegistrationNo', 100),
    address: required('enterHospitalAddress', 300),
    city: required('enterHospitalCity', 100),
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
  const { t } = useTranslation();
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
      toast.success(t('auth.registerHospital.received'));
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
        <h1 className="font-display text-display-md text-ink">{t('auth.registerHospital.title')}</h1>
        <p className="text-body text-text-muted">{t('auth.registerHospital.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
        <FormAlert>{formError}</FormAlert>

        <FormSection
          title={t('auth.registerHospital.hospitalSection')}
          description={t('auth.registerHospital.hospitalSectionBody')}
        >
          <Input
            label={t('auth.registerHospital.hospitalName')}
            autoComplete="organization"
            autoFocus
            error={errors.hospital?.name?.message}
            {...register('hospital.name')}
          />
          <Input
            label={t('auth.registerHospital.registrationNo')}
            hint={t('auth.registerHospital.registrationNoHint')}
            error={errors.hospital?.registrationNo?.message}
            {...register('hospital.registrationNo')}
          />
          <Input
            label={t('auth.registerHospital.address')}
            autoComplete="street-address"
            error={errors.hospital?.address?.message}
            {...register('hospital.address')}
          />
          <Input
            label={t('common.city')}
            list="hospital-city-suggestions"
            autoComplete="address-level2"
            hint={t('auth.registerHospital.cityHint')}
            error={errors.hospital?.city?.message}
            {...register('hospital.city')}
          />
          <datalist id="hospital-city-suggestions">
            {CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          <Input
            label={t('auth.registerHospital.hospitalPhone')}
            type="tel"
            inputMode="tel"
            placeholder="0112345678"
            hint={t('auth.registerHospital.hospitalPhoneHint')}
            error={errors.hospital?.phone?.message}
            {...register('hospital.phone')}
          />
        </FormSection>

        <FormSection
          title={t('auth.registerHospital.accountSection')}
          description={t('auth.registerHospital.accountSectionBody')}
        >
          <Input
            label={t('common.fullName')}
            autoComplete="name"
            error={errors.staff?.fullName?.message}
            {...register('staff.fullName')}
          />
          <Input
            label={t('auth.registerHospital.workEmail')}
            type="email"
            autoComplete="email"
            error={errors.staff?.email?.message}
            {...register('staff.email')}
          />
          <Input
            label={t('common.mobileNumber')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0771234567"
            error={errors.staff?.phone?.message}
            {...register('staff.phone')}
          />
          <PasswordInput
            label={t('common.password')}
            autoComplete="new-password"
            hint={t('common.passwordHint')}
            error={errors.staff?.password?.message}
            {...register('staff.password')}
          />
        </FormSection>

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {t('auth.registerHospital.submit')}
        </Button>
      </form>

      <p className="text-center text-body text-text-muted">
        <Trans i18nKey="auth.registerHospital.haveAccount" components={{ link: <Link to="/login" /> }} />
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
