import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import * as authApi from '../api/auth';
import { useAuth } from '../auth/useAuth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { BloodGroupPicker, Button, FormAlert, Input, PasswordInput } from '../components/ui';
import { CITIES } from '../lib/cities';
import { applyFieldErrors } from '../lib/formErrors';
import { msg } from '../lib/messages';
import {
  ageOn,
  cityField,
  emailField,
  fullNameField,
  newPasswordField,
  phoneField,
  toIsoDate,
} from '../lib/validation';
import { BLOOD_GROUPS, type ApiError } from '../types';

// Blood donation age range in Sri Lanka (backend: RegistrationService.MIN_DONOR_AGE / MAX_DONOR_AGE)
const MIN_AGE = 18;
const MAX_AGE = 60;

const schema = z.object({
  fullName: fullNameField,
  email: emailField,
  phone: phoneField,
  bloodGroup: z.enum(BLOOD_GROUPS, { error: msg('chooseBloodGroup') }),
  dateOfBirth: z
    .string()
    .min(1, msg('enterDateOfBirth'))
    .refine((date) => {
      const age = ageOn(date);
      return age >= MIN_AGE && age <= MAX_AGE;
    }, msg('donorAge')),
  city: cityField,
  password: newPasswordField,
});

type RegisterDonorForm = z.input<typeof schema>;
type RegisterDonorValues = z.output<typeof schema>;

const FIELDS = ['fullName', 'email', 'phone', 'bloodGroup', 'dateOfBirth', 'city', 'password'] as const;

/**
 * "Become a donor" (D1). The backend creates the DONOR user and their donor profile in one step and
 * signs them in; RedirectIfAuthenticated then sends them to /donor.
 */
export function RegisterDonorPage() {
  const { t } = useTranslation();
  const { startSession } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterDonorForm, unknown, RegisterDonorValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', phone: '', dateOfBirth: '', city: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const response = await authApi.registerDonor(values);
      toast.success(t('auth.registerDonor.welcome', { name: response.user.fullName.split(' ')[0] }));
      startSession(response, false);
    } catch (error) {
      const apiError = error as ApiError;
      // 409 "email already registered" and the backend's age check land on their fields
      if (!applyFieldErrors(apiError, setError, FIELDS)) {
        setFormError(apiError.message);
      }
    }
  });

  return (
    <AuthLayout>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-display-md text-ink">{t('auth.registerDonor.title')}</h1>
        <p className="text-body text-text-muted">{t('auth.registerDonor.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormAlert>{formError}</FormAlert>

        <Input
          label={t('common.fullName')}
          autoComplete="name"
          autoFocus
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input label={t('common.email')} type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label={t('common.mobileNumber')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0771234567"
          hint={t('auth.registerDonor.phoneHint')}
          error={errors.phone?.message}
          {...register('phone')}
        />

        <BloodGroupPicker
          legend={t('common.bloodGroup')}
          hint={t('auth.registerDonor.bloodGroupHint')}
          error={errors.bloodGroup?.message}
          registration={register('bloodGroup')}
        />

        <Input
          label={t('common.dateOfBirth')}
          type="date"
          max={toIsoDate(new Date())}
          hint={t('auth.registerDonor.ageHint')}
          error={errors.dateOfBirth?.message}
          {...register('dateOfBirth')}
        />

        <Input
          label={t('common.city')}
          list="city-suggestions"
          autoComplete="address-level2"
          hint={t('auth.registerDonor.cityHint')}
          error={errors.city?.message}
          {...register('city')}
        />
        <datalist id="city-suggestions">
          {CITIES.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>

        <PasswordInput
          label={t('common.password')}
          autoComplete="new-password"
          hint={t('common.passwordHint')}
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {t('auth.registerDonor.submit')}
        </Button>
      </form>

      <p className="text-center text-body text-text-muted">
        <Trans i18nKey="auth.registerDonor.haveAccount" components={{ link: <Link to="/login" /> }} />
      </p>
    </AuthLayout>
  );
}
